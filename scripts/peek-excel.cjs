const ExcelJS = require('exceljs')
const fs      = require('fs')
const filePath  = 'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast\\nova_base.xlsx'

async function main() {
  const row1 = [], row2 = []
  let rowCount = 0

  const stream = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    worksheets: 'emit', sharedStrings: 'cache',
    hyperlinks: 'ignore', styles: 'ignore', drawings: 'ignore',
  })

  await new Promise((resolve, reject) => {
    stream.on('worksheet', ws => {
      ws.on('row', row => {
        rowCount++
        if (rowCount === 1) row.eachCell({ includeEmpty: true }, (c, col) => { row1[col] = c.value })
        if (rowCount === 2) row.eachCell({ includeEmpty: true }, (c, col) => { row2[col] = c.value })
      })
    })
    stream.on('end', resolve)
    stream.on('error', reject)
    stream.read()
  })

  console.log('Total linhas de dados:', rowCount - 2)

  console.log('\n=== BLOCOS DE MESES (col base, offset 0-10) ===')
  for (let m = 0; m < 12; m++) {
    const base = 8 + m * 11
    const monthName = row1[base] || '???'
    const fields = []
    for (let f = 0; f < 11; f++) {
      fields.push(`+${f}:${row2[base + f] || ''}`)
    }
    console.log(`Mes ${m+1} (${monthName}) base=${base}: ${fields.join(' | ')}`)
  }

  console.log('\n=== COLUNAS ACUMULADAS (col 140+) ===')
  const accStart = 8 + 12 * 11   // = 140
  const maxCol = Math.max(row1.length, row2.length) + 10
  for (let c = accStart; c <= maxCol; c++) {
    const r1 = row1[c] != null ? String(row1[c]) : ''
    const r2 = row2[c] != null ? String(row2[c]) : ''
    if (r1 || r2) console.log(`  Col ${c}: [${r1}] / "${r2}"`)
  }
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1) })
