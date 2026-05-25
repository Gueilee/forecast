/**
 * Script de diagnóstico para verificar mapeamento de colunas do Excel
 */
import * as XLSX from 'xlsx'
import path from 'path'

const EXCEL_PATH = path.resolve(
  'c:/SHP.old/OneDrive - Vendemmia/Documentos/02 - Gestão de Projetos/40 - Forecast/forecast.xlsx'
)

const workbook = XLSX.readFile(EXCEL_PATH, { cellNF: true, cellText: false })
const sheet = workbook.Sheets['Base']
const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })

// Print row 4 (index 4) - totals row in Excel
console.log('\n=== ROW 4 (índice 4 = linha 5 no Excel) - Headers ===')
const header = rows[4] as unknown[]
for (let i = 0; i <= 30; i++) {
  if (header[i] != null && header[i] !== '') {
    console.log(`  [${i}] = "${header[i]}"`)
  }
}

// Print row 3 (index 3 = linha 4 no Excel) - totals
console.log('\n=== ROW 3 (índice 3 = linha 4 no Excel) - Totais ===')
const totRow = rows[3] as unknown[]
for (let i = 0; i <= 35; i++) {
  if (totRow[i] != null && totRow[i] !== '') {
    console.log(`  [${i}] = ${totRow[i]}`)
  }
}

// Find KRATON row and print columns 14-30
console.log('\n=== PROCURANDO KRATON ===')
for (let r = 5; r < rows.length; r++) {
  const row = rows[r] as unknown[]
  const name = String(row[1] ?? '').trim()
  if (name.includes('KRATON')) {
    console.log(`  Row index ${r} (Excel linha ${r + 1}): ${name}`)
    console.log('  Columns 14-30:')
    for (let c = 14; c <= 30; c++) {
      if (row[c] != null && row[c] !== '') {
        console.log(`    [${c}] = ${row[c]}`)
      }
    }
    break
  }
}

// Sum all PLANO values (col 16) across all active rows
console.log('\n=== SOMA PLANO JANEIRO (col index 16) ===')
let sumJan = 0
let countJan = 0
for (let r = 5; r < rows.length; r++) {
  const row = rows[r] as unknown[]
  const commercial = String(row[4] ?? '').trim()
  const name = String(row[1] ?? '').trim()
  if (!name || commercial === 'NÃO MEXER') continue
  const val = row[16]
  if (typeof val === 'number' && val > 0) {
    sumJan += val
    countJan++
  }
}
console.log(`  Soma PLANO col[16] (Jan): R$ ${sumJan.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
console.log(`  Rows com valor > 0: ${countJan}`)

// Sum all 12 months PLANO
const MONTH_COLS = [16, 28, 40, 52, 64, 76, 88, 100, 112, 124, 136, 148]
let totalPlan = 0
for (const startCol of MONTH_COLS) {
  let monthSum = 0
  for (let r = 5; r < rows.length; r++) {
    const row = rows[r] as unknown[]
    const commercial = String(row[4] ?? '').trim()
    const name = String(row[1] ?? '').trim()
    if (!name || commercial === 'NÃO MEXER') continue
    const val = row[startCol]
    if (typeof val === 'number') monthSum += val
  }
  totalPlan += monthSum
}
console.log(`\n=== SOMA TOTAL PLANO (todos os meses) ===`)
console.log(`  Total: R$ ${totalPlan.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
console.log(`  Esperado: R$ 447.823.285,91`)

// Count unique client names
const names = new Set<string>()
let totalRows = 0
for (let r = 5; r < rows.length; r++) {
  const row = rows[r] as unknown[]
  const commercial = String(row[4] ?? '').trim()
  const name = String(row[1] ?? '').trim()
  if (!name || commercial === 'NÃO MEXER') continue
  names.add(name)
  totalRows++
}
console.log(`\n=== CLIENTES ===`)
console.log(`  Total rows: ${totalRows}`)
console.log(`  Nomes únicos: ${names.size}`)
console.log(`  Duplicados: ${totalRows - names.size}`)
