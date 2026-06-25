/**
 * Importa nova_base.xlsx → atualiza BudgetEntry no Turso
 *
 * Atualiza por cliente: plan, fcMonth, lastWeek, mbPlanPct, mbFcPct
 * NÃO toca: faturado, orders, withoutOrders (vêm do Conexos API)
 *
 * Uso: node --env-file=.env scripts/import-nova-base.cjs
 */
'use strict'

const ExcelJS        = require('exceljs')
const { createClient } = require('@libsql/client')
const { randomUUID }   = require('crypto')
const path             = require('path')

const TURSO_URL   = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL) {
  console.error('❌  TURSO_DATABASE_URL não definido. Rode com: node --env-file=.env scripts/import-nova-base.cjs')
  process.exit(1)
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

const FILE = path.join('C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast', 'nova_base.xlsx')
const YEAR = 2026

// Coluna base (1-indexed) para cada mês — Jan=8, Fev=19, ...
const MONTH_BASE = Array.from({ length: 12 }, (_, i) => 8 + i * 11)

// Offsets dentro do bloco mensal
const OFF = { PLANO: 0, FC: 1, LASTWEEK: 7, MBPLAN: 8, MBFC: 9 }

const num  = v => (v == null || v === '' || Number.isNaN(Number(v))) ? null : Number(v)
const cid  = () => randomUUID().replace(/-/g, '').substring(0, 25)
const now  = () => new Date().toISOString()

// ── Carrega clientes do banco ────────────────────────────────────────────────
async function loadClients() {
  const res = await db.execute('SELECT id, nameReduced, nameChart FROM Client WHERE isActive = 1')
  const map = new Map()
  for (const r of res.rows) {
    // Mapeia por nameReduced normalizado
    const key = String(r.nameReduced ?? '').trim().toUpperCase()
    map.set(key, String(r.id))
  }
  return map
}

// ── Carrega BudgetEntries existentes ─────────────────────────────────────────
async function loadBudgets() {
  const res = await db.execute(
    `SELECT id, clientId, month FROM BudgetEntry WHERE year = ${YEAR}`
  )
  const map = new Map()
  for (const r of res.rows) {
    map.set(`${r.clientId}:${r.month}`, String(r.id))
  }
  return map
}

async function main() {
  console.log('📂 Lendo', FILE)

  // Lê todos os dados do Excel em memória (streaming)
  const rows = []
  const stream = new ExcelJS.stream.xlsx.WorkbookReader(FILE, {
    worksheets: 'emit', sharedStrings: 'cache',
    hyperlinks: 'ignore', styles: 'ignore', drawings: 'ignore',
  })

  await new Promise((resolve, reject) => {
    stream.on('worksheet', ws => {
      let rowIdx = 0
      ws.on('row', row => {
        rowIdx++
        if (rowIdx <= 2) return  // pula cabeçalhos
        const cells = {}
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cells[col] = cell.value
        })
        rows.push(cells)
      })
    })
    stream.on('end', resolve)
    stream.on('error', reject)
    stream.read()
  })

  console.log(`✅ ${rows.length} linhas lidas`)

  const clientMap = await loadClients()
  const budgetMap = await loadBudgets()

  console.log(`📋 ${clientMap.size} clientes no banco | ${budgetMap.size} BudgetEntries existentes`)

  let updated = 0, inserted = 0, skipped = 0, notFound = 0

  // Processa em batches de 20 linhas para não sobrecarregar Turso
  const BATCH = 20
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const statements = []

    for (const cells of batch) {
      const nameRaw = String(cells[2] ?? '').trim()
      if (!nameRaw) { skipped++; continue }

      const clientId = clientMap.get(nameRaw.toUpperCase())
      if (!clientId) {
        console.log(`  ⚠️  Cliente não encontrado: "${nameRaw}"`)
        notFound++
        continue
      }

      for (let m = 1; m <= 12; m++) {
        const base  = MONTH_BASE[m - 1]
        const plan  = num(cells[base + OFF.PLANO])
        const fc    = num(cells[base + OFF.FC])
        const lw    = num(cells[base + OFF.LASTWEEK])
        const mbp   = num(cells[base + OFF.MBPLAN])
        const mbf   = num(cells[base + OFF.MBFC])

        const key     = `${clientId}:${m}`
        const entryId = budgetMap.get(key)

        if (entryId) {
          // Atualiza apenas plan, fcMonth, lastWeek, mbPlanPct, mbFcPct
          statements.push({
            sql: `UPDATE BudgetEntry
                  SET plan = ?, fcMonth = ?, lastWeek = ?, mbPlanPct = ?, mbFcPct = ?, updatedAt = ?
                  WHERE id = ?`,
            args: [plan ?? 0, fc, lw, mbp, mbf, now(), entryId],
          })
          updated++
        } else {
          // Cria novo BudgetEntry
          const newId = cid()
          statements.push({
            sql: `INSERT INTO BudgetEntry
                    (id, clientId, year, month, plan, fcMonth, lastWeek, mbPlanPct, mbFcPct, createdAt, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [newId, clientId, YEAR, m, plan ?? 0, fc, lw, mbp, mbf, now(), now()],
          })
          budgetMap.set(key, newId)
          inserted++
        }
      }
    }

    if (statements.length > 0) {
      await db.batch(statements, 'write')
    }

    if ((i / BATCH) % 5 === 0) {
      process.stdout.write(`  Processadas: ${Math.min(i + BATCH, rows.length)}/${rows.length} linhas\r`)
    }
  }

  console.log('\n')
  console.log('✅ Importação concluída!')
  console.log(`   Clientes não encontrados: ${notFound}`)
  console.log(`   BudgetEntries atualizadas: ${updated}`)
  console.log(`   BudgetEntries criadas:     ${inserted}`)
  console.log(`   Linhas ignoradas (vazias): ${skipped}`)
}

main().catch(e => {
  console.error('\n❌ Erro:', e.message)
  console.error(e.stack)
  process.exit(1)
})
