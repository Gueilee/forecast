/**
 * Limpeza total + reimport fiel do nova_base.xlsx
 *
 * 1. Lê o Excel → coleta 189 nameReduced únicos + dados por mês
 * 2. Para cada nameReduced:
 *    - Se existe 1 cliente: usa esse
 *    - Se existem múltiplos (duplicatas do oficial.xlsx): mantém o que tem
 *      maior plan total 2026 (recém-atualizado), marca os outros isActive=false
 *    - Se não existe: cria novo cliente
 * 3. Marca isActive=false todos os clientes cujo nameReduced NÃO está no Excel
 *    (exceto isManual=1)
 * 4. Upserta BudgetEntry com TODOS os campos do Excel para os 189 clientes ativos
 *
 * Uso: node --env-file=.env scripts/fix-reimport-clean.cjs
 */
'use strict'

const ExcelJS = require('exceljs')
const { createClient } = require('@libsql/client')
const { randomUUID } = require('crypto')

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
if (!process.env.TURSO_DATABASE_URL) { console.error('❌ TURSO_DATABASE_URL não definido'); process.exit(1) }

const FILE = 'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast\\nova_base.xlsx'
const YEAR = 2026

// Coluna base de cada mês (Jan=8, Fev=19, ...)
const MONTH_BASE = Array.from({ length: 12 }, (_, i) => 8 + i * 11)
const OFF = { PLANO:0, FC:1, PEDIDO:2, SPEDIDO:3, FATURADO:4, LASTWEEK:7, MBPLAN:8, MBFC:9 }
const CI  = { CNXS:1, REDUCED:2, CATEGORIA:3, PL4:4, BU:5, CAT2:6, MODAL:7 }

const num  = v => (v == null || v === '' || Number.isNaN(Number(v))) ? 0 : Number(v)
const cid  = () => randomUUID().replace(/-/g,'').slice(0,25)
const now  = () => new Date().toISOString()
const str  = v => String(v ?? '').trim()
const M    = v => ((Number(v??0))/1_000_000).toFixed(2)+'M'

async function main() {
  console.log('📂 Lendo', FILE)

  // ── PASSO 1: Ler e agregar Excel por nameReduced ─────────────────────────
  const xlData = new Map()  // KEY (upper) → { meta, months: {1..12: {...}} }

  const stream = new ExcelJS.stream.xlsx.WorkbookReader(FILE, {
    worksheets:'emit', sharedStrings:'cache',
    hyperlinks:'ignore', styles:'ignore', drawings:'ignore',
  })
  await new Promise((res, rej) => {
    stream.on('worksheet', ws => {
      let rowIdx = 0
      ws.on('row', row => {
        rowIdx++
        if (rowIdx <= 2) return
        const cells = {}
        row.eachCell({ includeEmpty: true }, (c, col) => { cells[col] = c.value })
        const name = str(cells[CI.REDUCED])
        if (!name) return
        const key = name.toUpperCase()

        if (!xlData.has(key)) {
          xlData.set(key, {
            meta: {
              nameReduced:    name,
              conexosName:    str(cells[CI.CNXS]),
              commercialType: str(cells[CI.CATEGORIA]),
              pl4Bu:          str(cells[CI.PL4]),
              entity:         str(cells[CI.BU]),
              categoryBkNv:   str(cells[CI.CAT2]),
              modality:       str(cells[CI.MODAL]),
            },
            months: {},
          })
        }
        const entry = xlData.get(key)
        for (let m = 1; m <= 12; m++) {
          const base = MONTH_BASE[m-1]
          if (!entry.months[m]) {
            entry.months[m] = { plan:0, fc:0, pedido:0, spedido:0, faturado:0, lastWeek:0, mbPlan:0, mbFc:0, rows:0 }
          }
          const em = entry.months[m]
          em.plan     += num(cells[base + OFF.PLANO])
          em.fc       += num(cells[base + OFF.FC])
          em.pedido   += num(cells[base + OFF.PEDIDO])
          em.spedido  += num(cells[base + OFF.SPEDIDO])
          em.faturado += num(cells[base + OFF.FATURADO])
          em.lastWeek += num(cells[base + OFF.LASTWEEK])
          em.mbPlan   += num(cells[base + OFF.MBPLAN])
          em.mbFc     += num(cells[base + OFF.MBFC])
          em.rows++
        }
      })
    })
    stream.on('end', res); stream.on('error', rej); stream.read()
  })
  console.log(`✅ ${xlData.size} clientes únicos no Excel`)

  const xlKeys = new Set(xlData.keys())  // nomes normalizados (UPPER)

  // ── PASSO 2: Carregar TODOS os clientes do banco ─────────────────────────
  const allClients = await db.execute(`
    SELECT c.id, c.nameReduced, c.isManual, c.isActive,
           COALESCE(SUM(b.plan),0) as totalPlan
    FROM Client c
    LEFT JOIN BudgetEntry b ON b.clientId = c.id AND b.year = ${YEAR}
    GROUP BY c.id, c.nameReduced, c.isManual, c.isActive
  `)

  // Agrupa por nameReduced normalizado
  const byName = new Map()  // KEY → array de {id, totalPlan, isManual}
  for (const r of allClients.rows) {
    const key = str(r.nameReduced).toUpperCase()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push({
      id: String(r.id),
      totalPlan: Number(r.totalPlan ?? 0),
      isManual: Number(r.isManual) === 1,
      isActive: Number(r.isActive) === 1,
    })
  }

  console.log(`DB: ${allClients.rows.length} clientes totais`)

  // ── PASSO 3: Decidir qual cliente manter por nameReduced ─────────────────
  // activeClientMap[KEY] = clientId escolhido
  const activeClientMap = new Map()
  const deactivateIds   = []
  const createClients   = []

  // max sortOrder atual
  const sortRes = await db.execute('SELECT MAX(sortOrder) as mx FROM Client')
  let maxSort = Number(sortRes.rows[0]?.mx ?? 0)

  for (const [key, data] of xlData) {
    const candidates = byName.get(key) ?? []

    if (candidates.length === 0) {
      // Criar novo cliente
      maxSort++
      const newId = cid()
      const m = data.meta
      createClients.push({
        sql: `INSERT INTO Client
                (id, name, nameReduced, nameChart, entity, commercialType, pl4Bu,
                 modality, categoryBkNv, conexosName, isActive, isManual,
                 analytics, sortOrder, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,1,0,0,?,?,?)`,
        args: [
          newId, m.conexosName || m.nameReduced, m.nameReduced, m.nameReduced,
          m.entity || null, m.commercialType || null, m.pl4Bu || null,
          m.modality || null, m.categoryBkNv || null, m.conexosName || null,
          maxSort, now(), now(),
        ],
      })
      activeClientMap.set(key, newId)
      console.log(`  ✨ Novo: "${data.meta.nameReduced}"`)
    } else if (candidates.length === 1) {
      activeClientMap.set(key, candidates[0].id)
    } else {
      // Múltiplos: manter o que tem maior totalPlan (o que foi atualizado pelo import anterior)
      const sorted = [...candidates].sort((a, b) => b.totalPlan - a.totalPlan)
      activeClientMap.set(key, sorted[0].id)
      for (const other of sorted.slice(1)) {
        deactivateIds.push(other.id)
      }
      console.log(`  🔀 "${key}": ${candidates.length} duplicatas, mantendo ${sorted[0].id} (plan=${M(sorted[0].totalPlan)})`)
    }
  }

  // Marcar como inativo clientes que NÃO estão no Excel (exceto isManual)
  let ghostCount = 0
  for (const [key, candidates] of byName) {
    if (xlKeys.has(key)) continue
    for (const c of candidates) {
      if (c.isManual) continue  // preservar clientes manuais
      deactivateIds.push(c.id)
      ghostCount++
    }
  }

  console.log(`\n📋 Sumário:`)
  console.log(`   Clientes a criar:       ${createClients.length}`)
  console.log(`   IDs a desativar:        ${deactivateIds.length} (${ghostCount} fantasmas + duplicatas)`)
  console.log(`   Clientes ativos finais: ${activeClientMap.size}`)

  // ── PASSO 4: Criar clientes novos ────────────────────────────────────────
  if (createClients.length > 0) {
    await db.batch(createClients, 'write')
    console.log(`✅ ${createClients.length} clientes criados`)
  }

  // ── PASSO 5: Desativar fantasmas/duplicatas em batches ───────────────────
  if (deactivateIds.length > 0) {
    const BATCH = 50
    for (let i = 0; i < deactivateIds.length; i += BATCH) {
      const batch = deactivateIds.slice(i, i + BATCH)
      const placeholders = batch.map(() => '?').join(',')
      await db.execute({
        sql: `UPDATE Client SET isActive = 0, updatedAt = ? WHERE id IN (${placeholders})`,
        args: [now(), ...batch],
      })
    }
    console.log(`✅ ${deactivateIds.length} clientes desativados`)
  }

  // Garantir que clientes mantidos estão ativos
  const activeIds = [...activeClientMap.values()]
  const BATCH2 = 50
  for (let i = 0; i < activeIds.length; i += BATCH2) {
    const batch = activeIds.slice(i, i + BATCH2)
    const ph = batch.map(() => '?').join(',')
    await db.execute({
      sql: `UPDATE Client SET isActive = 1, updatedAt = ? WHERE id IN (${ph})`,
      args: [now(), ...batch],
    })
  }
  console.log(`✅ ${activeIds.length} clientes confirmados ativos`)

  // ── PASSO 6: Carregar BudgetEntries existentes ────────────────────────────
  const budgetsRes = await db.execute(
    `SELECT id, clientId, month FROM BudgetEntry WHERE year = ${YEAR}`
  )
  const budgetMap = new Map()
  for (const r of budgetsRes.rows) {
    budgetMap.set(`${r.clientId}:${r.month}`, String(r.id))
  }

  // ── PASSO 7: Upsert BudgetEntry com TODOS os campos ──────────────────────
  let updated = 0, inserted = 0
  const entries = [...xlData.entries()]
  const BATCH3 = 20

  for (let i = 0; i < entries.length; i += BATCH3) {
    const stmts = []
    for (const [key, data] of entries.slice(i, i + BATCH3)) {
      const clientId = activeClientMap.get(key)
      if (!clientId) continue

      for (let m = 1; m <= 12; m++) {
        const em    = data.months[m]
        if (!em) continue
        const mbPlanAvg = em.rows > 0 ? em.mbPlan / em.rows : null
        const mbFcAvg   = em.rows > 0 ? em.mbFc   / em.rows : null
        const bkey  = `${clientId}:${m}`
        const entId = budgetMap.get(bkey)

        if (entId) {
          stmts.push({
            sql: `UPDATE BudgetEntry
                  SET plan=?, fcMonth=?, orders=?, withoutOrders=?,
                      faturado=?, lastWeek=?, mbPlanPct=?, mbFcPct=?,
                      updatedAt=?
                  WHERE id=?`,
            args: [
              em.plan, em.fc||null, em.pedido||null, em.spedido||null,
              em.faturado||null, em.lastWeek||null,
              mbPlanAvg||null, mbFcAvg||null,
              now(), entId,
            ],
          })
          updated++
        } else {
          const newId = cid()
          stmts.push({
            sql: `INSERT INTO BudgetEntry
                    (id,clientId,year,month,plan,fcMonth,orders,withoutOrders,
                     faturado,lastWeek,mbPlanPct,mbFcPct,createdAt,updatedAt)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            args: [
              newId, clientId, YEAR, m,
              em.plan, em.fc||null, em.pedido||null, em.spedido||null,
              em.faturado||null, em.lastWeek||null,
              mbPlanAvg||null, mbFcAvg||null,
              now(), now(),
            ],
          })
          budgetMap.set(bkey, newId)
          inserted++
        }
      }
    }
    if (stmts.length > 0) await db.batch(stmts, 'write')
    process.stdout.write(`  ${Math.min(i+BATCH3, entries.length)}/${entries.length} clientes\r`)
  }

  console.log('\n')
  console.log(`✅ BudgetEntries atualizadas: ${updated}`)
  console.log(`✅ BudgetEntries criadas:     ${inserted}`)

  // ── PASSO 8: Verificação final ─────────────────────────────────────────────
  console.log('\n=== Verificação: totais por mês (apenas clientes ativos) ===')
  const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const check = await db.execute(`
    SELECT b.month,
           SUM(b.plan)    as plan,
           SUM(b.fcMonth) as fc,
           SUM(b.faturado) as fat,
           SUM(b.orders)  as ped
    FROM BudgetEntry b
    JOIN Client c ON c.id = b.clientId AND c.isActive = 1
    WHERE b.year = ${YEAR}
    GROUP BY b.month
    ORDER BY b.month
  `)

  console.log('Mês  | PLANO      | FC         | FATURADO   | PEDIDO')
  console.log('-----+------------+------------+------------+----------')
  for (const r of check.rows) {
    const m = Number(r.month) - 1
    console.log(`${MONTH_NAMES[m].padEnd(4)} | ${M(r.plan).padStart(10)} | ${M(r.fc).padStart(10)} | ${M(r.fat).padStart(10)} | ${M(r.ped).padStart(8)}`)
  }

  const totalPlan = check.rows.reduce((s,r) => s+Number(r.plan??0), 0)
  console.log(`\nTotal anual PLANO: ${M(totalPlan)}`)

  const activeCount = await db.execute('SELECT COUNT(*) as n FROM Client WHERE isActive = 1')
  console.log(`Clientes ativos: ${activeCount.rows[0].n}`)
}

main().catch(e => { console.error('❌', e.message, e.stack); process.exit(1) })
