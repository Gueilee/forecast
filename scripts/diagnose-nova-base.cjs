/**
 * Diagnóstico: compara nova_base.xlsx vs banco de dados
 * Mostra totais por mês para cada campo, destaca discrepâncias
 */
'use strict'

const ExcelJS = require('exceljs')
const { createClient } = require('@libsql/client')

const TURSO_URL   = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN
const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

const FILE = 'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast\\nova_base.xlsx'
const YEAR = 2026
const MONTH_BASE = Array.from({ length: 12 }, (_, i) => 8 + i * 11)
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const OFF = { PLANO:0, FC:1, PEDIDO:2, SPEDIDO:3, FATURADO:4, LASTWEEK:7, MBPLAN:8, MBFC:9 }

const num = v => (v == null || v === '' || Number.isNaN(Number(v))) ? 0 : Number(v)
const M   = v => (v/1_000_000).toFixed(2) + 'M'

async function main() {
  // 1) Ler Excel
  const rows = []
  const stream = new ExcelJS.stream.xlsx.WorkbookReader(FILE, {
    worksheets:'emit', sharedStrings:'cache',
    hyperlinks:'ignore', styles:'ignore', drawings:'ignore',
  })
  await new Promise((res, rej) => {
    stream.on('worksheet', ws => {
      let idx = 0
      ws.on('row', row => {
        idx++
        if (idx <= 2) return
        const cells = {}
        row.eachCell({ includeEmpty: true }, (cell, col) => { cells[col] = cell.value })
        rows.push(cells)
      })
    })
    stream.on('end', res)
    stream.on('error', rej)
    stream.read()
  })

  console.log(`\n=== Excel: ${rows.length} linhas lidas ===`)

  // Totais por mês no Excel
  const xlTotals = {}
  const xlClients = new Set()
  let xlBlankName = 0

  for (const cells of rows) {
    const nameRaw = String(cells[2] ?? '').trim()
    if (!nameRaw) { xlBlankName++; continue }
    xlClients.add(nameRaw.toUpperCase())

    for (let m = 1; m <= 12; m++) {
      const base = MONTH_BASE[m-1]
      if (!xlTotals[m]) xlTotals[m] = { plan:0, fc:0, pedido:0, spedido:0, faturado:0, lastWeek:0 }
      xlTotals[m].plan     += num(cells[base + OFF.PLANO])
      xlTotals[m].fc       += num(cells[base + OFF.FC])
      xlTotals[m].pedido   += num(cells[base + OFF.PEDIDO])
      xlTotals[m].spedido  += num(cells[base + OFF.SPEDIDO])
      xlTotals[m].faturado += num(cells[base + OFF.FATURADO])
      xlTotals[m].lastWeek += num(cells[base + OFF.LASTWEEK])
    }
  }
  console.log(`Excel clientes únicos (nameReduced): ${xlClients.size}`)
  console.log(`Excel linhas com nome vazio: ${xlBlankName}`)

  // 2) Ler banco
  const dbRows = await db.execute(
    `SELECT b.month, b.plan, b.fcMonth, b.orders, b.withoutOrders, b.faturado, b.lastWeek
     FROM BudgetEntry b
     JOIN Client c ON c.id = b.clientId
     WHERE b.year = ${YEAR} AND c.isActive = 1`
  )
  const dbTotals = {}
  for (const r of dbRows.rows) {
    const m = Number(r.month)
    if (!dbTotals[m]) dbTotals[m] = { plan:0, fc:0, pedido:0, spedido:0, faturado:0, lastWeek:0 }
    dbTotals[m].plan     += Number(r.plan ?? 0)
    dbTotals[m].fc       += Number(r.fcMonth ?? 0)
    dbTotals[m].pedido   += Number(r.orders ?? 0)
    dbTotals[m].spedido  += Number(r.withoutOrders ?? 0)
    dbTotals[m].faturado += Number(r.faturado ?? 0)
    dbTotals[m].lastWeek += Number(r.lastWeek ?? 0)
  }

  // 3) Checar clientes não encontrados
  const dbClients = await db.execute('SELECT nameReduced FROM Client WHERE isActive = 1')
  const dbClientSet = new Set(dbClients.rows.map(r => String(r.nameReduced ?? '').trim().toUpperCase()))

  const notFound = []
  for (const name of xlClients) {
    if (!dbClientSet.has(name)) notFound.push(name)
  }

  console.log(`\n=== Clientes no Excel não encontrados no banco (${notFound.length}) ===`)
  for (const n of notFound.sort()) console.log(`  - "${n}"`)

  // 4) Comparar totais por mês
  console.log('\n=== Comparação por mês ===')
  console.log('Mês     | PLANO-XL     | PLANO-DB     | DIFF-PLAN    | FAT-XL       | FAT-DB       | DIFF-FAT')
  console.log('--------+--------------+--------------+--------------+--------------+--------------+----------')
  for (let m = 1; m <= 12; m++) {
    const xl = xlTotals[m] ?? {}
    const db = dbTotals[m] ?? {}
    const dpln = (xl.plan    - db.plan)
    const dfat = (xl.faturado - db.faturado)
    const flag = (Math.abs(dpln) > 1_000_000 || Math.abs(dfat) > 1_000_000) ? ' ⚠️ ' : ''
    console.log(
      `${MONTH_NAMES[m-1].padEnd(7)} | ${M(xl.plan).padStart(12)} | ${M(db.plan).padStart(12)} | ${M(dpln).padStart(12)} | ${M(xl.faturado).padStart(12)} | ${M(db.faturado).padStart(12)} | ${M(dfat).padStart(8)}${flag}`
    )
  }

  // 5) Resumo por campo para Junho (mês 6)
  const m6 = 6
  const xl6 = xlTotals[m6] ?? {}
  const db6 = dbTotals[m6] ?? {}
  console.log('\n=== Junho (mês 6) — detalhado ===')
  const campos = [['PLANO','plan'],['FC','fc'],['PEDIDO','pedido'],['S/PEDIDO','spedido'],['FATURADO','faturado'],['ÚLT.SEM','lastWeek']]
  for (const [label, key] of campos) {
    console.log(`  ${label.padEnd(10)}: Excel=${M(xl6[key]??0).padStart(8)}  DB=${M(db6[key]??0).padStart(8)}  diff=${M((xl6[key]??0)-(db6[key]??0))}`)
  }

  console.log('\nDone.')
}

main().catch(e => { console.error(e.message); process.exit(1) })
