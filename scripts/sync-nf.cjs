/**
 * Sincroniza NFs do Conexos (Oracle VE3UB) → Turso
 *
 * Todas as BUs estão em VE3UB via coluna UND_NEGOCIO:
 *   VCI, ARM - NVG, ARM - ITV, ARM - GRV, TRP
 *
 * Usage: node sync-nf.cjs [ano] [mes]
 *   sem args        → mês atual
 *   2026            → ano inteiro
 *   2026 5          → mai/2026
 */

const oracledb = require('oracledb')
const { createClient } = require('@libsql/client')
const { randomUUID } = require('crypto')
const createId = () => randomUUID().replace(/-/g, '').substring(0, 25)

const TURSO_URL   = process.env.TURSO_URL   || process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN

const defaultOracleConn = (process.env.CONEXOS_HOST && process.env.CONEXOS_PORT && process.env.CONEXOS_SERVICE)
  ? `${process.env.CONEXOS_HOST}:${process.env.CONEXOS_PORT}/${process.env.CONEXOS_SERVICE}`
  : 'rds-vendemmia-uydge.conexos.cloud:15003/CONEXOS'

const ORACLE_CONFIG = {
  user:          process.env.ORACLE_USER       || process.env.CONEXOS_USER     || 'CNXBI_VENDEMMIA',
  password:      process.env.ORACLE_PASSWORD   || process.env.CONEXOS_PASSWORD || '',
  connectString: process.env.ORACLE_CONNECTION || defaultOracleConn,
}

// Filial usada na constraint única (invoiceNumber + filial) por BU
// VE3UB tem todas as BUs — UND_NEGOCIO identifica cada uma
const BU_FILIAL = {
  'VCI':       2,
  'ARM - NVG': 10,
  'ARM - ITV': 12,
  'ARM - GRV': 13,
  'TRP':       99,
}

const now = new Date()
const argYear  = parseInt(process.argv[2]) || null
const argMonth = parseInt(process.argv[3]) || null

let periods = []
if (argYear && argMonth) {
  periods = [{ year: argYear, month: argMonth }]
} else if (argYear) {
  for (let m = 1; m <= 12; m++) {
    if (argYear === now.getFullYear() && m > now.getMonth() + 1) break
    periods.push({ year: argYear, month: m })
  }
} else {
  for (let m = 1; m <= now.getMonth() + 1; m++) {
    periods.push({ year: now.getFullYear(), month: m })
  }
}

function weekOfMonth(date) { return Math.min(Math.ceil(date.getDate() / 7), 5) }

function normalize(str) {
  return String(str || '').toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function buildClientMap(turso, oConn) {
  const { rows: dbClients } = await turso.execute(
    `SELECT id, name, "nameReduced", "conexosCode" FROM "Client"`
  )

  const alreadyMapped = dbClients.filter(c => c.conexosCode != null)
  if (alreadyMapped.length > 0) {
    const map = {}
    alreadyMapped.forEach(c => { map[Number(c.conexosCode)] = String(c.id) })
    console.log(`📋 ${alreadyMapped.length} clientes já mapeados`)
    return map
  }

  console.log('🔗 Auto-mapeando clientes por nome...')
  const { rows: cnxClients } = await oConn.execute(
    `SELECT DISTINCT COD_CLIENTE, CLIENTE FROM VE3UB.VB_ANALISE_NF01 ORDER BY CLIENTE`,
    [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )

  const map = {}
  const updates = []
  for (const cc of cnxClients) {
    const ccNorm = normalize(cc.CLIENTE)
    const match  = dbClients.find(c =>
      normalize(c.name) === ccNorm || normalize(c.nameReduced) === ccNorm
    )
    if (match) {
      map[Number(cc.COD_CLIENTE)] = String(match.id)
      updates.push({
        sql: `UPDATE "Client" SET "conexosCode" = ?, "conexosName" = ? WHERE id = ?`,
        args: [Number(cc.COD_CLIENTE), String(cc.CLIENTE), String(match.id)],
      })
    }
  }
  if (updates.length > 0) {
    for (let i = 0; i < updates.length; i += 50) await turso.batch(updates.slice(i, i + 50))
    console.log(`📋 ${updates.length} clientes mapeados por nome`)
  }
  return map
}

async function migrateFilialPlaceholder(turso) {
  const { rows } = await turso.execute(`SELECT COUNT(*) as cnt FROM "ActualNF" WHERE filial = 0`)
  const cnt = Number(rows[0]?.cnt ?? 0)
  if (cnt === 0) return

  console.log(`\n🔧 Migrando ${cnt} registros filial=0 → filial correta via buName...`)

  // Atualiza filial com base no buName já gravado
  for (const [bu, filial] of Object.entries(BU_FILIAL)) {
    const { rowsAffected } = await turso.execute({
      sql: `UPDATE "ActualNF" SET filial = ? WHERE filial = 0 AND "buName" = ?`,
      args: [filial, bu],
    })
    if (rowsAffected > 0) console.log(`   ${bu} → filial=${filial}: ${rowsAffected} registros`)
  }
  // Qualquer restante sem buName mapeado vai para filial=2 (VCI)
  await turso.execute(`UPDATE "ActualNF" SET filial = 2 WHERE filial = 0`)
}

async function main() {
  if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('TURSO_URL e TURSO_TOKEN precisam estar configurados no ambiente.')
  }
  if (!ORACLE_CONFIG.password) {
    throw new Error('CONEXOS_PASSWORD ou ORACLE_PASSWORD precisa estar configurada no ambiente.')
  }
  console.log(`\nSincronizando ${periods.length} período(s) — schema VE3UB (todas as BUs)...\n`)

  const oConn = await oracledb.getConnection(ORACLE_CONFIG)
  console.log('✅ Conexos conectado (VE3UB)')

  const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  console.log('✅ Turso conectado')

  await migrateFilialPlaceholder(turso)

  const clientMap = await buildClientMap(turso, oConn)

  const jobId = createId()
  await turso.execute({
    sql: `INSERT INTO "SyncJob" (id, status, "recordsTotal", "recordsNew", "recordsUpdated", "startedAt", "triggeredBy")
          VALUES (?, 'RUNNING', 0, 0, 0, ?, 'SCRIPT')`,
    args: [jobId, new Date().toISOString()],
  })
  console.log(`\nJob: ${jobId}`)

  let grandNew = 0, grandUpdated = 0

  for (const { year, month } of periods) {
    const label = `${year}/${String(month).padStart(2, '0')}`
    process.stdout.write(`  ${label} ... `)

    const { rows } = await oConn.execute(`
      SELECT DOC_COD, COD_CLIENTE, CLIENTE,
             UND_NEGOCIO, TIPO_NF, PROC_CNX, REF_CLIENTE, FIS_DTA_EMISSAO,
             TOT_LIQUIDO, TOT_PRODUTOS,
             VLR_MNY_ICMS, VLR_MNY_ICMSST, VLR_MNY_PIS, VLR_MNY_COFINS, VLR_MNY_IPI
      FROM VE3UB.VB_ANALISE_NF01
      WHERE EXTRACT(YEAR  FROM FIS_DTA_EMISSAO) = :y
        AND EXTRACT(MONTH FROM FIS_DTA_EMISSAO) = :m`,
      { y: year, m: month },
      { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 2000 }
    )

    let newCount = 0, updCount = 0
    const weeklyMap = {}
    const BATCH = 50

    for (let i = 0; i < rows.length; i += BATCH) {
      const stmts = []

      for (const r of rows.slice(i, i + BATCH)) {
        const emDate = r.FIS_DTA_EMISSAO instanceof Date ? r.FIS_DTA_EMISSAO : new Date(r.FIS_DTA_EMISSAO)
        const emIso  = emDate.toISOString()
        const wom    = weekOfMonth(emDate)

        // BU vem diretamente de UND_NEGOCIO
        const buName  = r.UND_NEGOCIO ? String(r.UND_NEGOCIO) : 'VCI'
        const filial  = BU_FILIAL[buName] ?? 2

        const docId    = String(r.DOC_COD)
        const clientId = clientMap[Number(r.COD_CLIENTE)] || null
        const totNet   = Number(r.TOT_LIQUIDO    || 0)
        const totProd  = Number(r.TOT_PRODUTOS   || 0)
        const icms     = Number(r.VLR_MNY_ICMS   || 0)
        const icmsSt   = r.VLR_MNY_ICMSST != null ? Number(r.VLR_MNY_ICMSST) : null
        const pis      = Number(r.VLR_MNY_PIS    || 0)
        const cofins   = Number(r.VLR_MNY_COFINS || 0)
        const ipi      = Number(r.VLR_MNY_IPI    || 0)

        stmts.push({
          sql: `INSERT INTO "ActualNF"
                  (id, "clientId", "conexosClientCode", "clientNameRaw", "buName",
                   filial, "invoiceNumber", "emissionDate",
                   year, month, "weekOfMonth", scope, "processRef", "refCliente",
                   "totProduct", "totNet", icms, "icmsSt", pis, cofins, ipi,
                   source, "syncJobId", "createdAt")
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT("invoiceNumber", filial) DO UPDATE SET
                  "clientId"    = excluded."clientId",
                  "buName"      = excluded."buName",
                  "totNet"      = excluded."totNet",
                  "totProduct"  = excluded."totProduct",
                  icms          = excluded.icms,
                  "icmsSt"      = excluded."icmsSt",
                  pis           = excluded.pis,
                  cofins        = excluded.cofins,
                  ipi           = excluded.ipi,
                  "refCliente"  = excluded."refCliente",
                  "syncJobId"   = excluded."syncJobId"`,
          args: [
            createId(), clientId, Number(r.COD_CLIENTE),
            String(r.CLIENTE || ''), buName,
            filial, docId, emIso,
            year, month, wom,
            r.TIPO_NF      ? String(r.TIPO_NF)      : null,
            r.PROC_CNX     ? String(r.PROC_CNX)     : null,
            r.REF_CLIENTE  ? String(r.REF_CLIENTE)  : null,
            totProd, totNet, icms, icmsSt, pis, cofins, ipi,
            'CONEXOS', jobId, new Date().toISOString(),
          ],
        })

        // weeklyMap acumula SOMENTE NFs de SAÍDA (faturamento real)
        const isSaida = !r.TIPO_NF || !String(r.TIPO_NF).startsWith('ENT')
        if (isSaida) {
          const wKey = `${clientId || '_'}|${buName}|${year}|${month}|${wom}`
          if (!weeklyMap[wKey]) {
            weeklyMap[wKey] = { clientId, year, month, weekOfMonth: wom, totFaturado: 0, totProduct: 0, icms: 0, pis: 0, cofins: 0, ipi: 0 }
          }
          weeklyMap[wKey].totFaturado += totNet
          weeklyMap[wKey].totProduct  += totProd
          weeklyMap[wKey].icms        += icms
          weeklyMap[wKey].pis         += pis
          weeklyMap[wKey].cofins      += cofins
          weeklyMap[wKey].ipi         += ipi
        }
      }

      const results = await turso.batch(stmts)
      results.forEach(r => { if (r.rowsAffected > 0) newCount++; else updCount++ })
    }

    // Upsert ActualWeekly (clientes linkados)
    const weeklyStmts = Object.values(weeklyMap)
      .filter(w => w.clientId)
      .map(w => ({
        sql: `INSERT INTO "ActualWeekly"
                (id, "clientId", year, month, "weekOfMonth",
                 "totFaturado", "totProduct", icms, pis, cofins, ipi, "updatedAt")
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT("clientId", year, month, "weekOfMonth") DO UPDATE SET
                "totFaturado" = excluded."totFaturado",
                "totProduct"  = excluded."totProduct",
                icms = excluded.icms, pis = excluded.pis,
                cofins = excluded.cofins, ipi = excluded.ipi,
                "updatedAt"   = excluded."updatedAt"`,
        args: [
          createId(), w.clientId, w.year, w.month, w.weekOfMonth,
          w.totFaturado, w.totProduct, w.icms, w.pis, w.cofins, w.ipi,
          new Date().toISOString(),
        ],
      }))
    for (let i = 0; i < weeklyStmts.length; i += 50) await turso.batch(weeklyStmts.slice(i, i + 50))

    grandNew     += newCount
    grandUpdated += updCount
    console.log(`${rows.length} NFs → ${newCount} novas, ${updCount} atualizadas`)
  }

  await turso.execute({
    sql: `UPDATE "SyncJob" SET status='DONE', "recordsNew"=?, "recordsUpdated"=?,
          "recordsTotal"=?, "finishedAt"=? WHERE id=?`,
    args: [grandNew, grandUpdated, grandNew + grandUpdated, new Date().toISOString(), jobId],
  })

  console.log(`\n✅ Concluído! Novas: ${grandNew} | Atualizadas: ${grandUpdated}`)
  await oConn.close()
  process.exit(0)
}

main().catch(e => { console.error('\n❌ Erro:', e.message); console.error(e.stack); process.exit(1) })
