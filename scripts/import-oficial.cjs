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
const CURRENT_MONTH = new Date().getMonth() + 1  // mês corrente (1-12)
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

// Coluna do acumulado YTD faturado (seção "ACUMULADO - JUN" no Excel)
// Estrutura fixa: col 156=CONSOLIDADO, col 161=ACUMULADO, col 163=FATURADO acumulado
const ACUMULADO_FAT_COL = 163

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

  // ── PASSO 1: Agregar todas as linhas por cliente DB ───────────────────────
  // O Excel pode ter o mesmo cliente em múltiplas linhas (sub-contas, variantes).
  // Somamos os valores numéricos; metadados usam a última linha encontrada.
  console.log('\n⚙️   Passo 1: Agregando linhas do Excel por cliente…')

  // clientAgg: clientId → { meta, months[12]: {plan,fc,pedido,spedido,fat,lw,mbPlan,mbFc}, acum }
  const clientAgg = new Map()

  for (let r = 2; r < data.length; r++) {
    const row = data[r]
    if (!row[C.BU]) continue

    const bu        = str(row[C.BU])
    const comercial = str(row[C.COM])
    const pl4       = str(row[C.PL4])
    const cnxsName  = str(row[C.CNXS])
    const grafName  = str(row[C.GRAF])
    const mod       = str(row[C.MOD])
    const conta     = str(row[C.CONTA])
    const analytics = str(row[C.ANALYTICS]).toUpperCase() === 'SIM'
    const volume    = row[C.VOLUME] != null ? Number(row[C.VOLUME]) : null

    if (!grafName && !cnxsName) continue

    const chartKey = grafName.toLowerCase()
    const cnxsKey  = cnxsName.toLowerCase()
    let existing   = byChart.get(chartKey) ?? byCnxs.get(cnxsKey) ?? null

    if (!existing) {
      // Novo cliente — cria já no passo 1 para ter o ID disponível
      const newId      = randomUUID()
      sortCounter     += 10
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

    // Acumular dados mensais
    if (!clientAgg.has(clientId)) {
      clientAgg.set(clientId, {
        meta:   { bu, comercial, pl4, mod, conta, cnxsName, grafName, analytics, volume },
        months: Array.from({ length: 12 }, () => ({ plan:0, fc:null, pedido:null, spedido:null, fat:0, lw:null, mbPlan:null, mbFc:null })),
        acum:   0,
      })
    }

    const agg = clientAgg.get(clientId)
    // Metadados: última linha vence
    agg.meta = { bu, comercial, pl4, mod, conta, cnxsName, grafName, analytics, volume }
    // ACUMULADO YTD: somar (sub-contas distintas somam para o mesmo cliente)
    agg.acum += num(row[ACUMULADO_FAT_COL]) ?? 0

    for (let m = 0; m < 12; m++) {
      const base = MONTH_BASE[m]
      const mo   = agg.months[m]
      mo.plan    += num(row[base + S.PLANO])   ?? 0
      mo.fat     += num(row[base + S.FATURADO]) ?? 0
      mo.lw      = (mo.lw ?? 0) + (num(row[base + S.LASTWEEK]) ?? 0)
      // fc/pedido/spedido: somar valores não-nulos
      const fc  = num(row[base + S.FC])
      const ped = num(row[base + S.PEDIDO])
      const spe = num(row[base + S.SPEDIDO])
      if (fc   != null) mo.fc      = (mo.fc      ?? 0) + fc
      if (ped  != null) mo.pedido  = (mo.pedido  ?? 0) + ped
      if (spe  != null) mo.spedido = (mo.spedido ?? 0) + spe
      // mbPlan/mbFc: última linha vence (percentual, não faz sentido somar)
      const mbP = num(row[base + S.MBPLAN])
      const mbF = num(row[base + S.MBFC])
      if (mbP != null) mo.mbPlan = mbP
      if (mbF != null) mo.mbFc   = mbF
    }
  }

  // ── PASSO 2: Reconciliar e importar ─────────────────────────────────────
  // Para o mês corrente: faturado = max(fat_mensal_somado, max(0, acumulado - soma_meses_anteriores))
  console.log(`   ${clientAgg.size} clientes únicos encontrados`)
  console.log('\n⚙️   Passo 2: Atualizando metadados e importando budget entries…')

  let rowIdx = 0
  for (const [clientId, agg] of clientAgg) {
    rowIdx++

    // Atualiza metadados do cliente + faturadoYtd (ACUMULADO col 163)
    const { bu, comercial, pl4, mod, conta, cnxsName, grafName, analytics, volume } = agg.meta
    await db.execute({
      sql: `UPDATE Client
            SET entity=?, commercialType=?, pl4Bu=?, modality=?, accountManager=?,
                conexosName=?, nameChart=?, analytics=?, volumeRef=?, faturadoYtd=?, updatedAt=?
            WHERE id=?`,
      args: [bu, comercial, pl4, mod, conta, cnxsName || null, grafName || null,
             analytics ? 1 : 0, volume, agg.acum, ts, clientId],
    })
    if (!created) updated++  // created já foi incrementado no passo 1

    // Importar 12 meses
    for (let m = 0; m < 12; m++) {
      const mo = agg.months[m]
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
               mo.plan, mo.fc, mo.pedido, mo.spedido, mo.lw, mo.fat, mo.mbPlan, mo.mbFc, ts, ts],
      })
      entriesUpserted++
    }

    if (rowIdx % 50 === 0) process.stdout.write(`\r   Linha ${rowIdx}/${clientAgg.size}…  `)
  }

  // Corrigir contador de updated (não duplicar com created)
  updated = clientAgg.size - created

  // ── PASSO 3: Agregar ACUMULADO YTD por BU do Excel ────────────────────────
  // Soma col[ACUMULADO_FAT_COL] diretamente por BU, sem depender de matching.
  // Isso evita erros de cross-BU quando grafName/conexosName colide entre BUs.
  console.log('\n⚙️   Passo 3: Calculando faturadoYtd por BU (col ACUMULADO)…')
  const buAcum = new Map()
  for (let r = 2; r < data.length; r++) {
    const row = data[r]
    if (!row[C.BU]) continue
    const bu   = str(row[C.BU])
    const acum = num(row[ACUMULADO_FAT_COL]) ?? 0
    buAcum.set(bu, (buAcum.get(bu) ?? 0) + acum)
  }

  for (const [entity, fat] of buAcum) {
    await db.execute({
      sql: `INSERT INTO BuYtdFaturado (id, entity, year, faturadoYtd, updatedAt)
            VALUES (?,?,?,?,?)
            ON CONFLICT(entity,year) DO UPDATE SET faturadoYtd=excluded.faturadoYtd, updatedAt=excluded.updatedAt`,
      args: [randomUUID(), entity, YEAR, fat, ts],
    })
  }

  console.log(`   BUs calculadas: ${[...buAcum.entries()].map(([e, v]) => `${e}=R$${(v/1e6).toFixed(2)}M`).join(', ')}`)

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
