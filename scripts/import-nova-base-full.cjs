/**
 * Import COMPLETO: nova_base.xlsx → Turso
 *
 * - Agrupa linhas por nameReduced (soma múltiplas linhas do mesmo cliente)
 * - Cria clientes ausentes no banco
 * - Atualiza TODOS os campos: plan, fcMonth, orders, withoutOrders,
 *   faturado, lastWeek, mbPlanPct, mbFcPct
 *
 * Uso: node --env-file=.env scripts/import-nova-base-full.cjs
 */
'use strict'

const ExcelJS        = require('exceljs')
const { createClient } = require('@libsql/client')
const { randomUUID }   = require('crypto')

const TURSO_URL   = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN
if (!TURSO_URL) { console.error('❌ TURSO_DATABASE_URL não definido'); process.exit(1) }

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

const FILE = 'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast\\nova_base.xlsx'
const YEAR = 2026

// Colunas de info do cliente (1-indexed)
const CI = { CNXS: 1, REDUCED: 2, CATEGORIA: 3, PL4: 4, BU: 5, CAT2: 6, MODAL: 7 }

// Col base de cada mês (Jan=8, Fev=19, ...)
const MONTH_BASE = Array.from({ length: 12 }, (_, i) => 8 + i * 11)

// Offsets dentro do bloco mensal
const OFF = { PLANO:0, FC:1, PEDIDO:2, SPEDIDO:3, FATURADO:4, LASTWEEK:7, MBPLAN:8, MBFC:9 }

const num = v => (v == null || v === '' || Number.isNaN(Number(v))) ? 0 : Number(v)
const cid = () => randomUUID().replace(/-/g, '').slice(0, 25)
const now = () => new Date().toISOString()
const str = v => String(v ?? '').trim()

async function main() {
  console.log('📂 Lendo', FILE)

  // ── 1. Ler Excel, agrupar por nameReduced (soma múltiplas linhas) ────────
  // aggregated[nameREDUCED_UPPER] = { meta, months[1..12]: {plan, fc, pedido, spedido, faturado, lastWeek, mbPlan, mbFc, count} }
  const aggregated = new Map()

  const stream = new ExcelJS.stream.xlsx.WorkbookReader(FILE, {
    worksheets:'emit', sharedStrings:'cache',
    hyperlinks:'ignore', styles:'ignore', drawings:'ignore',
  })
  await new Promise((res, rej) => {
    stream.on('worksheet', ws => {
      let rowIdx = 0
      ws.on('row', row => {
        rowIdx++
        if (rowIdx <= 2) return  // pula cabeçalhos
        const cells = {}
        row.eachCell({ includeEmpty: true }, (cell, col) => { cells[col] = cell.value })

        const nameRaw = str(cells[CI.REDUCED])
        if (!nameRaw) return
        const key = nameRaw.toUpperCase()

        if (!aggregated.has(key)) {
          aggregated.set(key, {
            meta: {
              nameReduced:  nameRaw,
              conexosName:  str(cells[CI.CNXS]),
              commercialType: str(cells[CI.CATEGORIA]),
              pl4Bu:        str(cells[CI.PL4]),
              entity:       str(cells[CI.BU]),
              categoryBkNv: str(cells[CI.CAT2]),
              modality:     str(cells[CI.MODAL]),
            },
            months: {},
          })
        }

        const entry = aggregated.get(key)
        for (let m = 1; m <= 12; m++) {
          const base = MONTH_BASE[m - 1]
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
    stream.on('end', res)
    stream.on('error', rej)
    stream.read()
  })

  console.log(`✅ ${aggregated.size} clientes únicos no Excel`)

  // ── 2. Carregar clientes existentes ─────────────────────────────────────
  const clientsRes = await db.execute(
    'SELECT id, nameReduced, sortOrder FROM Client'
  )
  const dbByName  = new Map()
  let   maxSort   = 0
  for (const r of clientsRes.rows) {
    const key = String(r.nameReduced ?? '').trim().toUpperCase()
    dbByName.set(key, String(r.id))
    if (Number(r.sortOrder) > maxSort) maxSort = Number(r.sortOrder)
  }
  console.log(`📋 ${dbByName.size} clientes no banco | maxSortOrder = ${maxSort}`)

  // ── 3. Criar clientes ausentes ───────────────────────────────────────────
  let created = 0
  const createStmts = []
  for (const [key, data] of aggregated) {
    if (dbByName.has(key)) continue
    maxSort++
    const newId = cid()
    const m = data.meta
    createStmts.push({
      sql: `INSERT INTO Client
              (id, name, nameReduced, nameChart, entity, commercialType, pl4Bu,
               modality, categoryBkNv, conexosName, isActive, isManual,
               analytics, sortOrder, createdAt, updatedAt)
            VALUES (?,?,?,?,?,?,?,?,?,?,1,0,0,?,?,?)`,
      args: [
        newId,
        m.conexosName || m.nameReduced,
        m.nameReduced,
        m.nameReduced,
        m.entity || null,
        m.commercialType || null,
        m.pl4Bu || null,
        m.modality || null,
        m.categoryBkNv || null,
        m.conexosName || null,
        maxSort,
        now(), now(),
      ],
    })
    dbByName.set(key, newId)
    console.log(`  ✨ Criando cliente: "${m.nameReduced}" (BU=${m.entity})`)
    created++
  }

  if (createStmts.length > 0) {
    await db.batch(createStmts, 'write')
    console.log(`✅ ${created} clientes criados`)
  }

  // ── 4. Carregar BudgetEntries existentes ─────────────────────────────────
  const budgetsRes = await db.execute(
    `SELECT id, clientId, month FROM BudgetEntry WHERE year = ${YEAR}`
  )
  const budgetMap = new Map()
  for (const r of budgetsRes.rows) {
    budgetMap.set(`${r.clientId}:${r.month}`, String(r.id))
  }

  // ── 5. Upsert BudgetEntry para cada cliente e mês ───────────────────────
  let updated = 0, inserted = 0, skipped = 0
  const BATCH_SIZE = 25
  const entries = [...aggregated.entries()]

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const stmts = []

    for (const [key, data] of entries.slice(i, i + BATCH_SIZE)) {
      const clientId = dbByName.get(key)
      if (!clientId) { skipped++; continue }

      for (let m = 1; m <= 12; m++) {
        const em      = data.months[m]
        if (!em) continue

        const mbPlanAvg = em.rows > 0 ? em.mbPlan / em.rows : null
        const mbFcAvg   = em.rows > 0 ? em.mbFc   / em.rows : null
        const bkey  = `${clientId}:${m}`
        const entId = budgetMap.get(bkey)

        if (entId) {
          stmts.push({
            sql: `UPDATE BudgetEntry
                  SET plan = ?, fcMonth = ?, orders = ?, withoutOrders = ?,
                      faturado = ?, lastWeek = ?, mbPlanPct = ?, mbFcPct = ?,
                      updatedAt = ?
                  WHERE id = ?`,
            args: [
              em.plan, em.fc || null, em.pedido || null, em.spedido || null,
              em.faturado || null, em.lastWeek || null,
              mbPlanAvg || null, mbFcAvg || null,
              now(), entId,
            ],
          })
          updated++
        } else {
          const newId = cid()
          stmts.push({
            sql: `INSERT INTO BudgetEntry
                    (id, clientId, year, month, plan, fcMonth, orders, withoutOrders,
                     faturado, lastWeek, mbPlanPct, mbFcPct, createdAt, updatedAt)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            args: [
              newId, clientId, YEAR, m,
              em.plan, em.fc || null, em.pedido || null, em.spedido || null,
              em.faturado || null, em.lastWeek || null,
              mbPlanAvg || null, mbFcAvg || null,
              now(), now(),
            ],
          })
          budgetMap.set(bkey, newId)
          inserted++
        }
      }
    }

    if (stmts.length > 0) await db.batch(stmts, 'write')
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length} clientes processados\r`)
  }

  console.log('\n')
  console.log('✅ Importação completa!')
  console.log(`   Clientes criados:          ${created}`)
  console.log(`   BudgetEntries atualizadas: ${updated}`)
  console.log(`   BudgetEntries criadas:     ${inserted}`)
  console.log(`   Clientes ignorados:        ${skipped}`)

  // ── 6. Verificação rápida: totais do banco após import ───────────────────
  console.log('\n=== Verificação: totais mês 6 (Junho) no banco após import ===')
  const check = await db.execute(
    `SELECT SUM(plan) as plan, SUM(fcMonth) as fc,
            SUM(faturado) as fat, SUM(orders) as ped
     FROM BudgetEntry WHERE year = ${YEAR} AND month = 6`
  )
  const r = check.rows[0]
  const M = v => ((Number(v??0))/1_000_000).toFixed(2)+'M'
  console.log(`  PLANO:    ${M(r.plan)}`)
  console.log(`  FC:       ${M(r.fc)}`)
  console.log(`  FATURADO: ${M(r.fat)}`)
  console.log(`  PEDIDO:   ${M(r.ped)}`)
}

main().catch(e => { console.error('❌', e.message, e.stack); process.exit(1) })
