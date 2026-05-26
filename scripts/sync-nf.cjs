/**
 * Sincroniza NFs do Conexos (Oracle) → Turso
 * Fontes: todas as filiais via VB_ANALISE_NF01 (descoberta automática de schemas)
 * Destino: ActualNF + ActualWeekly
 *
 * Filiais mapeadas:
 *   Filial 02 → VCI
 *   Filial 10 → ARM - NVG (Navegantes CD 1)
 *   Filial 11 → ARM - NVG (Navegantes CD 2)
 *   Filial 12 → ARM - ITV (Itapevi)
 *   Filial 13 → ARM - GRV (Garuva)
 *
 * Usage: node sync-nf.cjs [ano] [mes]
 *   - sem args    : sincroniza o mês atual (todas as filiais)
 *   - node sync-nf.cjs 2026   : sincroniza 2026 inteiro
 *   - node sync-nf.cjs 2026 5 : sincroniza mai/2026
 */

const oracledb = require('oracledb')
const { createClient } = require('@libsql/client')
const { randomUUID } = require('crypto')
const createId = () => randomUUID().replace(/-/g, '').substring(0, 25)

const TURSO_URL   = process.env.TURSO_URL   || 'libsql://forecast-gueilee.aws-us-east-1.turso.io'
const TURSO_TOKEN = process.env.TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk2Nzk0NzYsImlkIjoiMDE5ZTVkMTEtZGMwMS03M2JjLWIyOTgtODFjOWM3NjkwY2M5IiwicmlkIjoiNGY0MDU0ZDQtYzliNS00MjljLTk5NjktNzg4NjY0YjZmYWM3In0.2_yL5h_ExuVFtIGcRf9b3j8HTLcmqm5-AbMO5m2mryR-C9jBCvpCaj0HURaspduQpf4BsX00E0O1QCjJOd1VBQ'

const ORACLE_CONFIG = {
  user:          process.env.ORACLE_USER       || 'CNXBI_VENDEMMIA',
  password:      process.env.ORACLE_PASSWORD   || 'BYBD3DBITDJY',
  connectString: process.env.ORACLE_CONNECTION || 'rds-vendemmia-uydge.conexos.cloud:15003/CONEXOS',
}

// Mapeamento filial → BU (conforme mapeamento oficial)
const FILIAL_BU = {
   2: 'VCI',
  10: 'ARM - NVG',  // Navegantes CD 1
  11: 'ARM - NVG',  // Navegantes CD 2
  12: 'ARM - ITV',  // Itapevi
  13: 'ARM - GRV',  // Garuva
}

const FILIAL_NAME = {
   2: 'VCI',
  10: 'Navegantes CD 1',
  11: 'Navegantes CD 2',
  12: 'Itapevi',
  13: 'Garuva',
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

// Descobre todos os schemas Oracle que possuem VB_ANALISE_NF01
async function discoverSchemas(conn) {
  console.log('\n🔍 Descobrindo schemas com VB_ANALISE_NF01...')
  const { rows } = await conn.execute(
    `SELECT OWNER FROM ALL_VIEWS WHERE VIEW_NAME = 'VB_ANALISE_NF01' ORDER BY OWNER`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )
  const schemas = rows.map(r => r.OWNER)
  console.log(`   Schemas encontrados: ${schemas.join(', ')}`)
  return schemas
}

// Detecta qual filial um schema representa (via FIL_COD da view)
async function detectFilialCode(conn, schema) {
  try {
    // Tenta pegar FIL_COD diretamente da view
    const { rows } = await conn.execute(
      `SELECT DISTINCT FIL_COD FROM ${schema}.VB_ANALISE_NF01 WHERE ROWNUM <= 10`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
    if (rows.length === 1) return Number(rows[0].FIL_COD)
    if (rows.length > 1) {
      // Schema tem múltiplas filiais — usa o código dominante
      const codes = rows.map(r => Number(r.FIL_COD))
      console.log(`   ⚠️  ${schema} tem múltiplas filiais: ${codes.join(', ')} — usando todas`)
      return codes
    }
  } catch {
    // FIL_COD não existe na view — tenta inferir pelo schema name
  }

  // Fallback: inferir pelo padrão de nome do schema (VE{n}UB)
  const match = schema.match(/VE(\d+)UB/i)
  if (match) {
    const n = Number(match[1])
    // VE3UB → filial 2 (VCI), VE10UB → filial 10, etc.
    return n === 3 ? 2 : n
  }

  return null
}

async function buildClientMap(turso, oConn, schema) {
  const { rows: dbClients } = await turso.execute(
    `SELECT id, name, "nameReduced", "conexosCode" FROM "Client"`
  )

  const alreadyMapped = dbClients.filter(c => c.conexosCode != null)
  if (alreadyMapped.length > 0) {
    const map = {}
    alreadyMapped.forEach(c => { map[Number(c.conexosCode)] = String(c.id) })
    return map
  }

  console.log('🔗 Auto-mapeando clientes por nome...')
  const { rows: cnxClients } = await oConn.execute(
    `SELECT DISTINCT COD_CLIENTE, CLIENTE FROM ${schema}.VB_ANALISE_NF01 ORDER BY CLIENTE`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
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
    for (let i = 0; i < updates.length; i += 50) {
      await turso.batch(updates.slice(i, i + 50))
    }
    console.log(`   📋 ${updates.length} clientes mapeados`)
  }
  return map
}

async function syncSchema(conn, turso, schema, filialCode, filialCodes, clientMap, jobId, periods) {
  const codes = Array.isArray(filialCodes) ? filialCodes : [filialCode]
  const buName = FILIAL_BU[filialCode] ?? 'VCI'
  const filialLabel = FILIAL_NAME[filialCode] ?? String(filialCode)

  // Constrói cláusula de filial para o WHERE (se FIL_COD existir na view)
  let filialFilter = ''
  let hasFilialCol = false
  try {
    await conn.execute(`SELECT FIL_COD FROM ${schema}.VB_ANALISE_NF01 WHERE ROWNUM = 1`, [], {})
    hasFilialCol = true
    if (codes.length === 1) {
      filialFilter = `AND FIL_COD = ${codes[0]}`
    } else {
      filialFilter = `AND FIL_COD IN (${codes.join(',')})`
    }
  } catch { /* coluna não existe — sem filtro */ }

  let totalNew = 0, totalUpdated = 0

  for (const { year, month } of periods) {
    const label = `${schema} ${year}/${String(month).padStart(2, '0')}`
    process.stdout.write(`  ${label} ... `)

    const { rows } = await conn.execute(`
      SELECT DOC_COD, FIS_NUM_DOCUMENTO, COD_CLIENTE, CLIENTE,
             ${hasFilialCol ? 'FIL_COD,' : ''}
             UND_NEGOCIO, TIPO_NF, TIPO_PROCESSO,
             PROC_CNX, REF_CLIENTE, FIS_DTA_EMISSAO,
             TOT_LIQUIDO, TOT_PRODUTOS,
             VLR_MNY_ICMS, VLR_MNY_ICMSST, VLR_MNY_PIS,
             VLR_MNY_COFINS, VLR_MNY_IPI
      FROM ${schema}.VB_ANALISE_NF01
      WHERE EXTRACT(YEAR  FROM FIS_DTA_EMISSAO) = :y
        AND EXTRACT(MONTH FROM FIS_DTA_EMISSAO) = :m
        ${filialFilter}`,
      { y: year, m: month },
      { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 2000 }
    )

    let newCount = 0, updCount = 0
    const weeklyMap = {}
    const BATCH = 50

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch  = rows.slice(i, i + BATCH)
      const stmts  = []

      for (const r of batch) {
        const emDate = r.FIS_DTA_EMISSAO instanceof Date ? r.FIS_DTA_EMISSAO : new Date(r.FIS_DTA_EMISSAO)
        const emIso  = emDate.toISOString()
        const wom    = weekOfMonth(emDate)

        // Determina filial real: FIL_COD da view > código do schema
        const rowFilial = r.FIL_COD != null ? Number(r.FIL_COD) : filialCode
        // Determina BU: prioriza mapeamento por filial, fallback para UND_NEGOCIO
        const rowBu = FILIAL_BU[rowFilial] ?? (r.UND_NEGOCIO ? String(r.UND_NEGOCIO) : buName)

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
                   year, month, "weekOfMonth", scope, "processRef",
                   "totProduct", "totNet", icms, "icmsSt", pis, cofins, ipi,
                   source, "syncJobId", "createdAt")
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
                  "syncJobId"   = excluded."syncJobId"`,
          args: [
            createId(), clientId, Number(r.COD_CLIENTE),
            String(r.CLIENTE || ''), rowBu,
            rowFilial, docId, emIso,
            year, month, wom,
            r.TIPO_NF    ? String(r.TIPO_NF)    : null,
            r.PROC_CNX   ? String(r.PROC_CNX)   : null,
            totProd, totNet, icms, icmsSt, pis, cofins, ipi,
            'CONEXOS', jobId, new Date().toISOString(),
          ],
        })

        const wKey = `${clientId || '_'}|${rowBu}|${year}|${month}|${wom}`
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
    for (let i = 0; i < weeklyStmts.length; i += 50) {
      await turso.batch(weeklyStmts.slice(i, i + 50))
    }

    totalNew     += newCount
    totalUpdated += updCount
    console.log(`${rows.length} NFs → ${newCount} novas, ${updCount} atualizadas`)
  }

  return { totalNew, totalUpdated }
}

async function migrateFilialPlaceholder(turso) {
  // Corrige registros VCI existentes que foram salvos com filial=0
  console.log('\n🔧 Corrigindo filial=0 (VCI) → filial=2...')

  // Primeiro verifica se há registros com filial=0
  const { rows: check } = await turso.execute(
    `SELECT COUNT(*) as cnt FROM "ActualNF" WHERE filial = 0`
  )
  const cnt = Number(check[0]?.cnt ?? 0)
  if (cnt === 0) {
    console.log('   Nenhum registro com filial=0 — nada a migrar')
    return
  }

  // Há risco de conflito se já existir registros com filial=2 para o mesmo invoiceNumber
  // Então: deleta os duplicados com filial=0 que já têm equivalente em filial=2, depois atualiza os restantes
  await turso.execute(
    `DELETE FROM "ActualNF"
     WHERE filial = 0
       AND "invoiceNumber" IN (
         SELECT "invoiceNumber" FROM "ActualNF" WHERE filial = 2
       )`
  )

  const { rowsAffected: deleted } = await turso.execute(
    `UPDATE "ActualNF" SET filial = 2, "buName" = 'VCI' WHERE filial = 0`
  )
  console.log(`   ✅ ${cnt} registros: ${deleted} atualizados para filial=2`)
}

async function main() {
  console.log(`\nSincronizando ${periods.length} período(s) — todas as filiais...\n`)

  const oConn = await oracledb.getConnection(ORACLE_CONFIG)
  console.log('✅ Conexos conectado')

  const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  console.log('✅ Turso conectado')

  // Corrige filial=0 antes de inserir novos dados (evita conflitos)
  await migrateFilialPlaceholder(turso)

  // Descobre todos os schemas disponíveis
  const schemas = await discoverSchemas(oConn)

  // Mapeia schema → filial code
  const schemaFilials = []
  for (const schema of schemas) {
    const filialResult = await detectFilialCode(oConn, schema)
    if (filialResult !== null) {
      const codes = Array.isArray(filialResult) ? filialResult : [filialResult]
      const primaryFilial = codes[0]
      const buLabel = codes.map(c => FILIAL_BU[c] ?? `Filial ${c}`).join(' + ')
      console.log(`   ${schema} → ${buLabel} (filial ${codes.join('+')})`)
      schemaFilials.push({ schema, filialCode: primaryFilial, filialCodes: codes })
    } else {
      console.log(`   ${schema} → filial não identificada — pulando`)
    }
  }

  // Carrega mapa de clientes (uma vez, do schema VCI)
  const vciSchema = schemaFilials.find(s => FILIAL_BU[s.filialCode] === 'VCI')?.schema ?? schemas[0]
  const clientMap = await buildClientMap(turso, oConn, vciSchema)

  // Job de sync
  const jobId    = createId()
  const jobStart = new Date().toISOString()
  await turso.execute({
    sql: `INSERT INTO "SyncJob" (id, status, "recordsTotal", "recordsNew", "recordsUpdated", "startedAt", "triggeredBy")
          VALUES (?, 'RUNNING', 0, 0, 0, ?, 'SCRIPT')`,
    args: [jobId, jobStart],
  })
  console.log(`\nJob: ${jobId}`)

  let grandNew = 0, grandUpdated = 0

  for (const { schema, filialCode, filialCodes } of schemaFilials) {
    const buName = FILIAL_BU[filialCode] ?? `Filial ${filialCode}`
    console.log(`\n--- ${buName} (${schema}) ---`)
    const { totalNew, totalUpdated } = await syncSchema(
      oConn, turso, schema, filialCode, filialCodes, clientMap, jobId, periods
    )
    grandNew     += totalNew
    grandUpdated += totalUpdated
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
