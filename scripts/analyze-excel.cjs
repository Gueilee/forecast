const XLSX = require('xlsx')
const path = require('path')

const wb   = XLSX.readFile(path.join(__dirname, '..', 'oficial.xlsx'), { cellFormulas: false })
const ws   = wb.Sheets[wb.SheetNames[0]]
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })

// Row 2 (idx 1) = headers; Data starts at row 3 (idx 2)
// Col mapping (0-indexed): 1=BU 2=COMERCIAL 3=4PL 4=CNXS 5=GRAF 6=MODAL 7=CONTA 8=ANALYTICS
const [BU, COM, PL4, CNXS, GRAF, MOD, CONTA] = [1, 2, 3, 4, 5, 6, 7]

const sets = { BU: new Set(), COMERCIAL: new Set(), '4PL': new Set(), MODALIDADE: new Set(), CONTA: new Set() }
const colIdx = { BU, COMERCIAL: COM, '4PL': PL4, MODALIDADE: MOD, CONTA }

let rows = 0
for (let r = 2; r < data.length; r++) {
  const row = data[r]
  if (!row[BU]) continue
  rows++
  for (const [k, ci] of Object.entries(colIdx)) sets[k].add(String(row[ci] ?? '').trim())
}
console.log(`\nLinhas com dados: ${rows}`)
for (const [k, s] of Object.entries(sets)) {
  console.log(`\n${k} (${s.size}):`)
  ;[...s].sort().forEach(v => console.log(`  "${v}"`))
}

// Sample 3 rows full month data
console.log('\n=== SAMPLE MESES (linha 3, 4, 5) ===')
const MONTH_NAMES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']
for (let r = 2; r <= 4 && r < data.length; r++) {
  const row = data[r]
  if (!row[BU]) continue
  console.log(`\n[${row[GRAF]}] BU=${row[BU]} COMERCIAL=${row[COM]} 4PL=${row[PL4]} MOD=${row[MOD]} CONTA=${row[CONTA]}`)
  for (let m = 0; m < 12; m++) {
    const base = 12 + m * 12
    const plan = row[base] ?? 0
    const fc   = row[base + 1] ?? 0
    const fat  = row[base + 4] ?? 0
    if (plan || fc || fat)
      console.log(`  ${MONTH_NAMES[m]}: PLANO=${Number(plan).toFixed(0)} FC=${Number(fc).toFixed(0)} FAT=${Number(fat).toFixed(0)}`)
  }
}
