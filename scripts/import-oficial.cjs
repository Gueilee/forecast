/**
 * Importa dados da planilha oficial.xlsx para o Turso.
 * Uso: node --env-file=.env scripts/import-oficial.cjs
 *
 * Lê clientes + 12 meses de dados por cliente.
 * Cria/atualiza Client e BudgetEntry via libsql direto.
 */

'use strict'

const XLSX   = require('xlsx')
const path   = require('path')
const { createClient } = require('@libsql/client')
const { randomUUID }   = require('crypto')

// ── Conexão Turso ────────────────────────────────────────────────────────────
const TURSO_URL   = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL) {
  console.error('❌  TURSO_DATABASE_URL não definido. Rode com: node --env-file=.env scripts/import-oficial.cjs')
  process.exit(1)
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

// ── Constantes ────────────────────────────────────────────────────────────────
const YEAR = 2026
const EXCEL = path.join(__dirname, '..', 'oficial.xlsx')

// Índices de coluna (0-based na linha de dados):
// Row 1 (idx 0) = meses mesclados; Row 2 (idx 1) = sub-headers; Data a partir de idx 2
const C = {
  KEY: 0, BU: 1, COM: 2, PL4: 3, CNXS: 4, GRAF: 5,
  MOD: 6, CONTA: 7, ANALYTICS: 8, VOLUME: 9,
}

// Base de coluna para cada mês (Jan=12, Fev=24, …, Dez=144)
const MONTH_BASE = Array.from({ length: 12 }, (_, i) => 12 + i * 12)

// Offset dentro de cada mês
const S = {
  PLANO: 0, FC: 1, PEDIDO: 2, SPEDIDO: 3, FATURADO: 4,
  DESVIO: 5, AFATURAR: 6, LASTWEEK: 7, MBPLAN: 8, MBFC: 9,
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ── Helpers ───────────────────────────────────────────────────────────────────
const num  = v => (v == null ? null : Number(v) || 0)
const str  = v => String(v ?? '').trim()
const now  = () => new Date().toISOString()

// ── Schema migration ──────────────────────────────────────────────────────────
async function ensureColumns() {
  const info = await db.execute('PRAGMA table_info(BudgetEntry)')
  const cols = info.rows.map(r => String(r.name))
  const missing = []
  if (!cols.includes('lastWeek')) missing.push('ALTER TABLE BudgetEntry ADD COLUMN lastWeek REAL')
  if (!cols.includes('faturado')) missing.push('ALTER TABLE BudgetEntry ADD COLUMN faturado REAL')
  for (const sql of missing) {
    await db.execute(sql)
    console.log(`   Coluna adicionada: ${sql.match(/COLUMN (\w+)/)[1]}`)
  }
}

// ── Carrega clientes existentes ───────────────────────────────────────────────
async function loadExistingClients() {
  const res = await db.execute(
    'SELECT id, nameChart, nameReduced, conexosName, sortOrder FROM Client'
  )
  const byChart  = new Map()  // key = nameChart.toLowerCase()
  const byCnxs   = new Map()  // key = conexosName.toLowerCase()
  let   maxSort  = 0

  for (const row of res.rows) {
    const chart = str(row.nameChart).toLowerCase()
    const cnxs  = str(row.conexosName).toLowerCase()
    if (chart) byChart.set(chart, row)
    if (cnxs)  byCnxs.set(cnxs, row)
    if (Number(row.sortOrder) > maxSort) maxSort = Number(row.sortOrder)
  }
  return { byChart, byCnxs, maxSort }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📊  Lendo oficial.xlsx…')
  const wb   = XLSX.readFile(EXCEL, { cellFormulas: false })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
  console.log(`   ${data.length - 2} linhas de dados encontradas (excl. 2 headers)`)

  console.log('\n🔌  Conectando ao Turso…')
  await ensureColumns()

  console.log('\n📥  Carregando clientes existentes…')
  let { byChart, byCnxs, maxSort } = await loadExistingClients()
  console.log(`   ${byChart.size} clientes no banco`)

  let created = 0, updated = 0, entriesUpserted = 0, sortCounter = maxSort + 10
  const ts = now()

  console.log('\n⚙️   Processando linhas…')

  for (let r = 2; r < data.length; r++) {
    const row = data[r]
    if (!row[C.BU]) continue

    const bu       = str(row[C.BU])
    const comercial = str(row[C.COM])
    const pl4      = str(row[C.PL4])
    const cnxsName = str(row[C.CNXS])
    const grafName = str(row[C.GRAF])
    const mod      = str(row[C.MOD])
    const conta    = str(row[C.CONTA])
    const analytics = str(row[C.ANALYTICS]).toUpperCase() === 'SIM'
    const volume   = row[C.VOLUME] != null ? Number(row[C.VOLUME]) : null

    if (!grafName && !cnxsName) continue

    const chartKey = grafName.toLowerCase()
    const cnxsKey  = cnxsName.toLowerCase()

    let existing = byChart.get(chartKey) ?? byCnxs.get(cnxsKey) ?? null

    if (existing) {
      // Atualiza metadados
      await db.execute({
        sql: `UPDATE Client
              SET entity=?, commercialType=?, pl4Bu=?, modality=?, accountManager=?,
                  conexosName=?, nameChart=?, analytics=?, volumeRef=?, updatedAt=?
              WHERE id=?`,
        args: [bu, comercial, pl4, mod, conta, cnxsName || null, grafName || null,
               analytics ? 1 : 0, volume, ts, String(existing.id)],
      })
      updated++
    } else {
      // Cria novo cliente
      const newId = randomUUID()
      sortCounter += 10
      const displayName = grafName || cnxsName
      await db.execute({
        sql: `INSERT INTO Client
                (id, name, nameReduced, nameChart, entity, commercialType, pl4Bu,
                 modality, accountManager, conexosName, analytics, volumeRef,
                 isActive, sortOrder, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)`,
        args: [newId, displayName, displayName, grafName || null,
               bu, comercial, pl4, mod, conta, cnxsName || null,
               analytics ? 1 : 0, volume, sortCounter, ts, ts],
      })
      existing = { id: newId }
      byChart.set(chartKey, existing)
      if (cnxsKey) byCnxs.set(cnxsKey, existing)
      created++
    }

    const clientId = String(existing.id)

    // Importa dados mensais
    for (let m = 0; m < 12; m++) {
      const base     = MONTH_BASE[m]
      const plan     = num(row[base + S.PLANO]) ?? 0
      const fc       = num(row[base + S.FC])
      const pedido   = num(row[base + S.PEDIDO])
      const sPedido  = num(row[base + S.SPEDIDO])
      const faturado = num(row[base + S.FATURADO])
      const lastWeek = num(row[base + S.LASTWEEK])
      const mbPlan   = num(row[base + S.MBPLAN])
      const mbFc     = num(row[base + S.MBFC])

      await db.execute({
        sql: `INSERT INTO BudgetEntry
                (id, clientId, year, month, plan, fcMonth, orders, withoutOrders,
                 lastWeek, faturado, mbPlanPct, mbFcPct, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(clientId,year,month) DO UPDATE SET
                plan=excluded.plan,
                fcMonth=excluded.fcMonth,
                orders=excluded.orders,
                withoutOrders=excluded.withoutOrders,
                lastWeek=excluded.lastWeek,
                faturado=excluded.faturado,
                mbPlanPct=excluded.mbPlanPct,
                mbFcPct=excluded.mbFcPct,
                updatedAt=excluded.updatedAt`,
        args: [randomUUID(), clientId, YEAR, m + 1,
               plan, fc, pedido, sPedido, lastWeek, faturado, mbPlan, mbFc, ts, ts],
      })
      entriesUpserted++
    }

    if ((r - 1) % 50 === 0) {
      const lineNum = r - 1
      process.stdout.write(`\r   Linha ${lineNum}/${data.length - 2}…  `)
    }
  }

  console.log(`\n\n✅  Importação concluída:`)
  console.log(`   Clientes criados:    ${created}`)
  console.log(`   Clientes atualizados: ${updated}`)
  console.log(`   Entradas de orçamento: ${entriesUpserted}`)
  console.log(`\n   Meses importados (Jan–Dez ${YEAR}) para ${created + updated} clientes.`)

  await db.close()
}

main().catch(err => {
  console.error('\n❌  Erro fatal:', err)
  process.exit(1)
})
