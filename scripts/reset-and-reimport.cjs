/**
 * Reset completo: apaga todos BudgetEntry 2026 e reimporta de oficial_2.xlsx.
 * Chave de agregação: (grafName, BU) — clientes multi-BU viram registros separados.
 * Autorizado explicitamente pelo usuário.
 * Uso: node --env-file=.env scripts/reset-and-reimport.cjs
 */
'use strict'

const XLSX   = require('xlsx')
const { createClient } = require('@libsql/client')
const { randomUUID }   = require('crypto')

const TURSO_URL   = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN
if (!TURSO_URL) { console.error('❌  Defina TURSO_DATABASE_URL'); process.exit(1) }

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

const YEAR  = 2026
const EXCEL = 'c:/SHP.old/OneDrive - Vendemmia/Documentos/02 - Gestão de Projetos/40 - Forecast/oficial_2.xlsx'

// ── Mapeamento oficial_2.xlsx ─────────────────────────────────────────────────
// Col 0=CLIENTE, 1=CLIENTE GRAFICO, 2=COMERCIAL, 3=4PL, 4=CONTA, 5=BU, 6=MODALIDADE
const C = { NOME:0, GRAF:1, COM:2, PL4:3, CONTA:4, BU:5, MOD:6 }
// Cada mês = 11 colunas: Jan começa em 7, step=11
const MONTH_BASE = Array.from({ length: 12 }, (_, i) => 7 + i * 11)
const S = { PLANO:0, FC:1, PEDIDO:2, SPEDIDO:3, FATURADO:4, DESVIO:5, AFATURAR:6, LASTWEEK:7, MBPLAN:8, MBFC:9 }
const ACUMULADO_FAT_COL = 145  // col[145] = FATURADO YTD em CONSOLIDADO

const num = v => (v == null ? null : Number(v) || 0)
const str = v => String(v ?? '').trim()
const now = () => new Date().toISOString()

// ── Carrega clientes existentes indexados por (nameChart, entity) ─────────────
async function loadExistingClients() {
  const res = await db.execute('SELECT id, nameChart, nameReduced, entity, conexosName FROM Client')
  const byNameBu = new Map()   // key = "nameChart|entity" (primary — multi-BU aware)
  const byName   = new Map()   // key = "nameChart" (fallback — for old single-BU records)
  let maxSort    = 0

  const sortRes = await db.execute('SELECT MAX(sortOrder) as m FROM Client')
  maxSort = Number(sortRes.rows[0].m ?? 0)

  for (const row of res.rows) {
    const chart  = str(row.nameChart).toLowerCase()
    const entity = str(row.entity).toLowerCase()
    if (chart) {
      byNameBu.set(chart + '|' + entity, row)
      if (!byName.has(chart)) byName.set(chart, row)
    }
    // Also index by nameReduced for backward compat
    const reduced = str(row.nameReduced).toLowerCase()
    if (reduced && !byName.has(reduced)) byName.set(reduced, row)
  }
  return { byNameBu, byName, maxSort }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📊  Lendo oficial_2.xlsx…')
  const wb   = XLSX.readFile(EXCEL, { cellFormulas: false })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
  console.log('   ' + (data.length - 2) + ' linhas de dados encontradas')

  console.log('\n🔌  Conectando ao Turso…')

  // ── STEP 1: DELETE todos BudgetEntry 2026 ─────────────────────────────────
  console.log('\n🗑️   Apagando todos BudgetEntry de 2026…')
  const del = await db.execute(`DELETE FROM BudgetEntry WHERE year = ${YEAR}`)
  console.log('   ' + del.rowsAffected + ' registros removidos')

  console.log('\n📥  Carregando clientes existentes…')
  let { byNameBu, byName, maxSort } = await loadExistingClients()
  const uniqueClients = new Set([...byNameBu.values()].map(r => String(r.id)))
  console.log('   ' + uniqueClients.size + ' clientes no banco')

  // ── STEP 2: Agregar por (grafName, BU) ────────────────────────────────────
  // Um cliente que aparece em múltiplas BUs vira registros SEPARADOS no DB.
  // Dentro da mesma (grafName, BU), linhas com COM diferentes são SOMADAS.
  console.log('\n⚙️   Passo 1: Agregando linhas por (CLIENTE, BU)…')

  const clientAgg = new Map()   // key = "grafName|||bu" → { clientId, meta, months, acum }
  const idByKey   = new Map()   // key → db clientId
  let created = 0
  const ts = now()

  for (let r = 2; r < data.length; r++) {
    const row = data[r]
    if (!row || !row[C.BU]) continue

    const bu        = str(row[C.BU])
    const grafName  = str(row[C.GRAF])
    const nomeFull  = str(row[C.NOME])
    const comercial = str(row[C.COM])
    const pl4       = str(row[C.PL4])
    const conta     = str(row[C.CONTA])
    const mod       = str(row[C.MOD])

    if (!grafName && !nomeFull) continue

    const displayName = grafName || nomeFull
    const aggKey      = displayName.toLowerCase() + '|||' + bu.toLowerCase()

    // Resolver clientId para este (grafName, BU)
    if (!idByKey.has(aggKey)) {
      // Tenta match por (nameChart, entity) — exato multi-BU
      const primaryKey = displayName.toLowerCase() + '|' + bu.toLowerCase()
      let existing = byNameBu.get(primaryKey) ?? null

      // Fallback: usa registro existente pelo nome se a entidade também bateu
      if (!existing) {
        const byNameRow = byName.get(displayName.toLowerCase())
        if (byNameRow && str(byNameRow.entity).toLowerCase() === bu.toLowerCase()) {
          existing = byNameRow
        }
      }

      if (!existing) {
        // Novo cliente para este (grafName, BU)
        const newId = randomUUID()
        maxSort += 10
        await db.execute({
          sql: `INSERT INTO Client
                  (id, name, nameReduced, nameChart, entity, commercialType, pl4Bu,
                   modality, accountManager, analytics, isActive, sortOrder, createdAt, updatedAt)
                VALUES (?,?,?,?,?,?,?,?,?,0,1,?,?,?)`,
          args: [newId, nomeFull || displayName, displayName, grafName || null,
                 bu, comercial, pl4, mod, conta, maxSort, ts, ts],
        })
        existing = { id: newId }
        byNameBu.set(primaryKey, existing)
        created++
      }

      idByKey.set(aggKey, String(existing.id))
    }

    const clientId = idByKey.get(aggKey)

    if (!clientAgg.has(aggKey)) {
      clientAgg.set(aggKey, {
        clientId,
        meta:   { bu, comercial, pl4, mod, conta, grafName, nomeFull },
        months: Array.from({ length: 12 }, () => ({
          plan:0, fc:null, pedido:null, spedido:null, fat:0, lw:null, mbPlan:null, mbFc:null,
        })),
        acum: 0,
      })
    }

    const agg = clientAgg.get(aggKey)
    // Meta: última linha COM vence (para categorização no filtro)
    agg.meta = { bu, comercial, pl4, mod, conta, grafName, nomeFull }
    // ACUMULADO YTD: somar
    agg.acum += num(row[ACUMULADO_FAT_COL]) ?? 0

    // Somar valores mensais
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

  console.log('   ' + clientAgg.size + ' entradas únicas (grafName, BU)')

  // ── STEP 3: Inserir BudgetEntries + atualizar metadados ──────────────────
  console.log('\n⚙️   Passo 2: Inserindo orçamentos e atualizando metadados…')
  let rowIdx = 0, entriesInserted = 0

  for (const [, agg] of clientAgg) {
    rowIdx++
    const { bu, comercial, pl4, mod, conta, grafName } = agg.meta
    const clientId = agg.clientId

    // Atualiza metadados do cliente — preserva conexosName
    await db.execute({
      sql: `UPDATE Client
            SET entity=?, commercialType=?, pl4Bu=?, modality=?, accountManager=?,
                nameChart=?, faturadoYtd=?, updatedAt=?
            WHERE id=?`,
      args: [bu, comercial, pl4, mod, conta, grafName || null, agg.acum, ts, clientId],
    })

    // Insere 12 meses
    for (let m = 0; m < 12; m++) {
      const mo = agg.months[m]
      await db.execute({
        sql: `INSERT INTO BudgetEntry
                (id, clientId, year, month, plan, fcMonth, orders, withoutOrders,
                 lastWeek, faturado, mbPlanPct, mbFcPct, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [randomUUID(), clientId, YEAR, m + 1,
               mo.plan, mo.fc, mo.pedido, mo.spedido,
               mo.lw, mo.fat, mo.mbPlan, mo.mbFc, ts, ts],
      })
      entriesInserted++
    }

    if (rowIdx % 50 === 0) process.stdout.write('\r   Linha ' + rowIdx + '/' + clientAgg.size + '…  ')
  }

  // ── STEP 4: BuYtdFaturado ─────────────────────────────────────────────────
  console.log('\n\n⚙️   Passo 3: Atualizando BuYtdFaturado…')
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
  console.log('   ' + [...buAcum.entries()].map(([e,v]) => e+'=R$'+(v/1e6).toFixed(3)+'M').join(', '))

  // ── STEP 5: Verificação ───────────────────────────────────────────────────
  console.log('\n🔍  Verificação final por BU…')
  const check = await db.execute(`
    SELECT c.entity, COUNT(DISTINCT c.id) as cnt, SUM(b.plan) as plan, SUM(b.faturado) as fat
    FROM BudgetEntry b JOIN Client c ON b.clientId = c.id
    WHERE b.year = ${YEAR}
    GROUP BY c.entity ORDER BY plan DESC
  `)
  for (const row of check.rows) {
    console.log('  ' + String(row.entity).padEnd(12) +
      ' | ' + String(row.cnt).padStart(3) + ' clientes' +
      ' | Plano=R$' + (Number(row.plan)/1e6).toFixed(3) + 'M' +
      ' | Faturado=R$' + (Number(row.fat)/1e6).toFixed(3) + 'M')
  }
  const tot = await db.execute(`SELECT SUM(plan) as p, SUM(faturado) as f FROM BudgetEntry WHERE year=${YEAR}`)
  console.log('  TOTAL        | ' + String(clientAgg.size).padStart(3) + ' entradas   ' +
    '| Plano=R$' + (Number(tot.rows[0].p)/1e6).toFixed(3) + 'M' +
    ' | Faturado=R$' + (Number(tot.rows[0].f)/1e6).toFixed(3) + 'M')

  console.log('\n✅  Concluído:')
  console.log('   Novos clientes criados:  ' + created)
  console.log('   Entradas (grafName,BU):  ' + clientAgg.size)
  console.log('   BudgetEntries inseridos: ' + entriesInserted)

  await db.close()
}

main().catch(err => { console.error('\n❌  Erro:', err); process.exit(1) })
