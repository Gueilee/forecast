/**
 * Importa dados do oficial_2.xlsx para o Turso.
 * Uso: node --env-file=.env scripts/import-oficial2.cjs
 *
 * Estrutura oficial_2.xlsx (148 colunas):
 *   Col 0  = CLIENTE (nome completo)
 *   Col 1  = CLIENTE GRAFICO (nameChart)
 *   Col 2  = COMERCIAL (commercialType)
 *   Col 3  = 4PL (pl4Bu)
 *   Col 4  = CONTA (accountManager)
 *   Col 5  = BU (entity)
 *   Col 6  = MODALIDADE (modality)
 *   Col 7+ = 12 meses × 11 colunas (PLANO, FC MÊS, PEDIDO, S/PEDIDO, FATURADO,
 *              DESVIO PLANO, A FATURAR MÊS, ULTIMA SEMANA, MB PLAN, MB FC, COMENTÁRIO)
 *   Col 139-147 = CONSOLIDADO (PLANO 2026, 2026-FC, PEDIDO, MBPLAN, MBFC,
 *                               PLANO YTD, FATURADO YTD, MB ACUM, MB ACUM)
 */

'use strict'

const XLSX   = require('xlsx')
const path   = require('path')
const { createClient } = require('@libsql/client')
const { randomUUID }   = require('crypto')

const TURSO_URL   = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL) {
  console.error('❌  TURSO_DATABASE_URL não definido. Rode com: node --env-file=.env scripts/import-oficial2.cjs')
  process.exit(1)
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

const YEAR  = 2026
const EXCEL = path.join('c:/SHP.old/OneDrive - Vendemmia/Documentos/02 - Gestão de Projetos/40 - Forecast', 'oficial_2.xlsx')

// ── Mapeamento de colunas ─────────────────────────────────────────────────────
const C = {
  NOME:  0,   // CLIENTE (nome completo)
  GRAF:  1,   // CLIENTE GRAFICO
  COM:   2,   // COMERCIAL
  PL4:   3,   // 4PL
  CONTA: 4,   // CONTA
  BU:    5,   // BU
  MOD:   6,   // MODALIDADE
}

// Base de coluna para cada mês: Jan=7, Fev=18, Mar=29, …, Dez=128 (step=11)
const MONTH_BASE = Array.from({ length: 12 }, (_, i) => 7 + i * 11)

// Offset dentro de cada bloco mensal
const S = {
  PLANO:    0,
  FC:       1,
  PEDIDO:   2,
  SPEDIDO:  3,
  FATURADO: 4,
  DESVIO:   5,
  AFATURAR: 6,
  LASTWEEK: 7,
  MBPLAN:   8,
  MBFC:     9,
  // 10 = COMENTÁRIO DA SEMANA (ignorado)
}

// Coluna FATURADO YTD no bloco CONSOLIDADO
const ACUMULADO_FAT_COL = 145

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ── Helpers ───────────────────────────────────────────────────────────────────
const num = v => (v == null ? null : Number(v) || 0)
const str = v => String(v ?? '').trim()
const now = () => new Date().toISOString()

// ── Schema migration ──────────────────────────────────────────────────────────
async function ensureColumns() {
  const info = await db.execute('PRAGMA table_info(BudgetEntry)')
  const cols = info.rows.map(r => String(r.name))
  if (!cols.includes('lastWeek')) await db.execute('ALTER TABLE BudgetEntry ADD COLUMN lastWeek REAL')
  if (!cols.includes('faturado')) await db.execute('ALTER TABLE BudgetEntry ADD COLUMN faturado REAL')
}

// ── Carrega clientes existentes ───────────────────────────────────────────────
async function loadExistingClients() {
  const res = await db.execute('SELECT id, nameChart, nameReduced, conexosName, sortOrder FROM Client')
  const byChart = new Map()
  const byCnxs  = new Map()
  let maxSort   = 0
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
  console.log('📊  Lendo oficial_2.xlsx…')
  const wb   = XLSX.readFile(EXCEL, { cellFormulas: false })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
  console.log('   Total de linhas (incl. 2 headers):', data.length)

  console.log('\n🔌  Conectando ao Turso…')
  await ensureColumns()

  console.log('\n📥  Carregando clientes existentes…')
  let { byChart, byCnxs, maxSort } = await loadExistingClients()
  console.log('   ' + byChart.size + ' clientes no banco')

  let created = 0, updated = 0, entriesUpserted = 0
  let sortCounter = maxSort + 10
  const ts = now()

  // ── PASSO 1: Agregar linhas do Excel por cliente ──────────────────────────
  console.log('\n⚙️   Passo 1: Agregando linhas por cliente…')
  const clientAgg = new Map()

  for (let r = 2; r < data.length; r++) {
    const row = data[r]
    if (!row || !row[C.BU]) continue

    const bu       = str(row[C.BU])
    const grafName = str(row[C.GRAF])
    const nomeFull = str(row[C.NOME])
    const comercial = str(row[C.COM])
    const pl4       = str(row[C.PL4])
    const conta     = str(row[C.CONTA])
    const mod       = str(row[C.MOD])

    if (!grafName && !nomeFull) continue

    const displayName = grafName || nomeFull
    const chartKey    = displayName.toLowerCase()

    let existing = byChart.get(chartKey) ?? null

    // Fallback: try matching by nameReduced (grafName often equals nameReduced)
    if (!existing) {
      const res = await db.execute({
        sql: 'SELECT id FROM Client WHERE LOWER(nameReduced) = ? LIMIT 1',
        args: [chartKey],
      })
      if (res.rows.length > 0) existing = res.rows[0]
    }

    if (!existing) {
      // Novo cliente
      const newId = randomUUID()
      sortCounter += 10
      await db.execute({
        sql: `INSERT INTO Client
                (id, name, nameReduced, nameChart, entity, commercialType, pl4Bu,
                 modality, accountManager, analytics, isActive, sortOrder, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,0,1,?,?,?)`,
        args: [newId, nomeFull || displayName, displayName, grafName || null,
               bu, comercial, pl4, mod, conta, sortCounter, ts, ts],
      })
      existing = { id: newId }
      byChart.set(chartKey, existing)
      created++
    }

    const clientId = String(existing.id)

    if (!clientAgg.has(clientId)) {
      clientAgg.set(clientId, {
        meta:   { bu, comercial, pl4, mod, conta, grafName, nomeFull },
        months: Array.from({ length: 12 }, () => ({
          plan: 0, fc: null, pedido: null, spedido: null,
          fat: 0, lw: null, mbPlan: null, mbFc: null,
        })),
        acum: 0,
      })
    }

    const agg   = clientAgg.get(clientId)
    agg.meta    = { bu, comercial, pl4, mod, conta, grafName, nomeFull }
    agg.acum   += num(row[ACUMULADO_FAT_COL]) ?? 0

    for (let m = 0; m < 12; m++) {
      const base = MONTH_BASE[m]
      const mo   = agg.months[m]
      mo.plan   += num(row[base + S.PLANO])    ?? 0
      mo.fat    += num(row[base + S.FATURADO]) ?? 0
      mo.lw      = (mo.lw ?? 0) + (num(row[base + S.LASTWEEK]) ?? 0)
      const fc  = num(row[base + S.FC])
      const ped = num(row[base + S.PEDIDO])
      const spe = num(row[base + S.SPEDIDO])
      if (fc  != null) mo.fc      = (mo.fc      ?? 0) + fc
      if (ped != null) mo.pedido  = (mo.pedido  ?? 0) + ped
      if (spe != null) mo.spedido = (mo.spedido ?? 0) + spe
      const mbP = num(row[base + S.MBPLAN])
      const mbF = num(row[base + S.MBFC])
      if (mbP != null) mo.mbPlan = mbP
      if (mbF != null) mo.mbFc   = mbF
    }
  }

  console.log('   ' + clientAgg.size + ' clientes únicos encontrados')

  // ── PASSO 2: Atualizar metadados + importar budget entries ───────────────
  console.log('\n⚙️   Passo 2: Atualizando metadados e importando budget entries…')
  let rowIdx = 0
  for (const [clientId, agg] of clientAgg) {
    rowIdx++
    const { bu, comercial, pl4, mod, conta, grafName, nomeFull } = agg.meta

    // Atualiza metadados — NÃO toca conexosName (usado pelo sync daemon)
    await db.execute({
      sql: `UPDATE Client
            SET entity=?, commercialType=?, pl4Bu=?, modality=?, accountManager=?,
                nameChart=?, faturadoYtd=?, updatedAt=?
            WHERE id=?`,
      args: [bu, comercial, pl4, mod, conta, grafName || null, agg.acum, ts, clientId],
    })
    if (rowIdx > created) updated++

    // Importar 12 meses
    for (let m = 0; m < 12; m++) {
      const mo = agg.months[m]
      await db.execute({
        sql: `INSERT INTO BudgetEntry
                (id, clientId, year, month, plan, fcMonth, orders, withoutOrders,
                 lastWeek, faturado, mbPlanPct, mbFcPct, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(clientId,year,month) DO UPDATE SET
                plan=excluded.plan, fcMonth=excluded.fcMonth,
                orders=excluded.orders, withoutOrders=excluded.withoutOrders,
                lastWeek=excluded.lastWeek, faturado=excluded.faturado,
                mbPlanPct=excluded.mbPlanPct, mbFcPct=excluded.mbFcPct,
                updatedAt=excluded.updatedAt`,
        args: [randomUUID(), clientId, YEAR, m + 1,
               mo.plan, mo.fc, mo.pedido, mo.spedido, mo.lw, mo.fat,
               mo.mbPlan, mo.mbFc, ts, ts],
      })
      entriesUpserted++
    }

    if (rowIdx % 50 === 0) process.stdout.write('\r   Linha ' + rowIdx + '/' + clientAgg.size + '…  ')
  }

  updated = clientAgg.size - created

  // ── PASSO 3: Faturado YTD por BU (col 145 ACUMULADO) ─────────────────────
  console.log('\n\n⚙️   Passo 3: Calculando faturadoYtd por BU (col 145)…')
  const buAcum = new Map()
  for (let r = 2; r < data.length; r++) {
    const row = data[r]
    if (!row || !row[C.BU]) continue
    const bu   = str(row[C.BU])
    const acum = num(row[ACUMULADO_FAT_COL]) ?? 0
    buAcum.set(bu, (buAcum.get(bu) ?? 0) + acum)
  }

  for (const [entity, fat] of buAcum) {
    await db.execute({
      sql: `INSERT INTO BuYtdFaturado (id, entity, year, faturadoYtd, updatedAt)
            VALUES (?,?,?,?,?)
            ON CONFLICT(entity,year) DO UPDATE SET
              faturadoYtd=excluded.faturadoYtd, updatedAt=excluded.updatedAt`,
      args: [randomUUID(), entity, YEAR, fat, ts],
    })
  }

  console.log('   BUs: ' + [...buAcum.entries()].map(([e, v]) => e + '=R$' + (v / 1e6).toFixed(3) + 'M').join(', '))
  console.log('   TOTAL: R$' + ([...buAcum.values()].reduce((a, b) => a + b, 0) / 1e6).toFixed(3) + 'M')

  console.log('\n✅  Importação concluída:')
  console.log('   Clientes criados:      ' + created)
  console.log('   Clientes atualizados:  ' + updated)
  console.log('   Entradas de orçamento: ' + entriesUpserted)
  console.log('   Meses: Jan–Dez ' + YEAR + ' para ' + (created + updated) + ' clientes')

  await db.close()
}

main().catch(err => {
  console.error('\n❌  Erro fatal:', err)
  process.exit(1)
})
