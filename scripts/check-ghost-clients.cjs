/**
 * Mostra clientes no banco que NÃO estão no nova_base.xlsx
 * e seus valores de BudgetEntry para identificar os "fantasmas"
 */
'use strict'

const ExcelJS = require('exceljs')
const { createClient } = require('@libsql/client')

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const FILE = 'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast\\nova_base.xlsx'
const YEAR = 2026

async function main() {
  // Nomes no Excel
  const xlNames = new Set()
  const stream = new ExcelJS.stream.xlsx.WorkbookReader(FILE, {
    worksheets:'emit', sharedStrings:'cache',
    hyperlinks:'ignore', styles:'ignore', drawings:'ignore',
  })
  await new Promise((res, rej) => {
    stream.on('worksheet', ws => {
      let idx = 0
      ws.on('row', row => { idx++; if (idx <= 2) return; const v = String(row.getCell(2).value ?? '').trim(); if (v) xlNames.add(v.toUpperCase()) })
    })
    stream.on('end', res); stream.on('error', rej); stream.read()
  })
  console.log(`Excel: ${xlNames.size} nomes únicos`)

  // Clientes no banco
  const res = await db.execute(`
    SELECT c.id, c.nameReduced, c.entity, c.commercialType, c.isManual, c.isActive,
           COALESCE(SUM(b.plan),0) as totalPlan,
           COALESCE(SUM(b.faturado),0) as totalFat
    FROM Client c
    LEFT JOIN BudgetEntry b ON b.clientId = c.id AND b.year = ${YEAR}
    GROUP BY c.id, c.nameReduced, c.entity, c.commercialType, c.isManual, c.isActive
    ORDER BY totalPlan DESC
  `)

  const ghost = res.rows.filter(r => !xlNames.has(String(r.nameReduced ?? '').trim().toUpperCase()))

  console.log(`\nDB total clientes: ${res.rows.length}`)
  console.log(`Clientes NÃO no Excel: ${ghost.length}\n`)

  let ghostPlan = 0, ghostFat = 0
  console.log('ID                        | nameReduced          | BU          | manual | ativo | PLAN-total  | FAT-total')
  console.log('---------------------------+----------------------+-------------+--------+-------+-------------+----------')
  for (const r of ghost) {
    const plan = Number(r.totalPlan ?? 0)
    const fat  = Number(r.totalFat ?? 0)
    ghostPlan += plan
    ghostFat  += fat
    const M = v => (v/1_000_000).toFixed(1)+'M'
    console.log(
      `${String(r.id).padEnd(25)} | ${String(r.nameReduced ?? '').padEnd(20)} | ${String(r.entity ?? '').padEnd(11)} | ${r.isManual ? 'SIM' : 'não'} | ${r.isActive ? 'SIM' : 'NÃO'} | ${M(plan).padStart(11)} | ${M(fat)}`
    )
  }

  const M = v => (v/1_000_000).toFixed(1)+'M'
  console.log(`\nTotal PLANO dos fantasmas: ${M(ghostPlan)}`)
  console.log(`Total FAT dos fantasmas:   ${M(ghostFat)}`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
