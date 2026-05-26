const XLSX = require('xlsx')
const path = require('path')

const filePath = path.join(
  'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast',
  'base_conexos.xlsx'
)

const wb   = XLSX.readFile(filePath)
const ws   = wb.Sheets['BaseContabil']
const range = XLSX.utils.decode_range(ws['!ref'])

console.log('Dimensões:', range.e.r + 1, 'linhas x', range.e.c + 1, 'colunas\n')

// Ler todas as linhas como array-de-arrays
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

// Encontrar a linha do cabeçalho real (primeira com muitas colunas preenchidas)
for (let i = 0; i < 30; i++) {
  const row = raw[i]
  const nonNull = row.filter(v => v !== null && v !== undefined && v !== '').length
  if (nonNull > 5) {
    console.log(`Linha ${i + 1} (${nonNull} valores):`, row.slice(0, range.e.c + 1).join(' | '))
  } else {
    const filled = row.map((v, idx) => v !== null ? `[col${idx}]=${v}` : null).filter(Boolean)
    if (filled.length > 0) console.log(`Linha ${i + 1}:`, filled.join(', '))
  }
}

// Mostrar linhas 9-25 completamente para encontrar o header
console.log('\n=== Linhas 9-25 (busca pelo cabeçalho) ===')
for (let i = 8; i < 25; i++) {
  const row = raw[i]
  if (!row) continue
  const nonNull = row.filter(v => v !== null && v !== undefined && v !== '').length
  console.log(`Linha ${i + 1} (${nonNull} vals):`, row.slice(0, 30).map(v => v ?? '').join(' | '))
}
