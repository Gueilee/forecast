/**
 * Exporta NFs do Turso para Excel no mesmo formato da base_conexos.xlsx
 * Colunas financeiras completas; colunas sem equivalente em Turso ficam em branco.
 *
 * Usage: node export-from-turso.cjs [ano]
 */

const { createClient } = require('@libsql/client')
const ExcelJS = require('exceljs')
const path = require('path')

const TURSO_URL   = process.env.TURSO_URL   || process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Erro: TURSO_URL e TURSO_TOKEN precisam estar definidos no ambiente.')
  process.exit(1)
}

const YEAR = parseInt(process.argv[2]) || 2026

// Mapeamento filial → BU (mesmo que sync-nf.cjs)
const FILIAL_BU = {
   2: 'VCI',
  10: 'ARM - NVG',
  11: 'ARM - NVG',
  12: 'ARM - ITV',
  13: 'ARM - GRV',
}

const MONTHS_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKS_PT = ['', '1ª Semana', '2ª Semana', '3ª Semana', '4ª Semana', '5ª Semana']

function formatDate(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  } catch { return '' }
}

async function main() {
  console.log(`\n📊 Exportando dados Turso ${YEAR} → Excel...\n`)

  const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  console.log('✅ Turso conectado')

  // Carregar clientes para join
  const { rows: clients } = await turso.execute(
    `SELECT id, name, "nameReduced", entity FROM "Client"`
  )
  const clientById = {}
  for (const c of clients) {
    clientById[String(c.id)] = c
  }
  console.log(`📋 ${clients.length} clientes carregados`)

  // Buscar todas as NFs do ano
  const { rows: nfs } = await turso.execute({
    sql: `SELECT
            "invoiceNumber", "clientId", "clientNameRaw", "buName",
            filial, "emissionDate", year, month, "weekOfMonth",
            scope, "processRef",
            "totProduct", "totNet", icms, "icmsSt", pis, cofins, ipi,
            "conexosClientCode"
          FROM "ActualNF"
          WHERE year = ?
          ORDER BY "emissionDate", CAST("invoiceNumber" AS INTEGER)`,
    args: [YEAR],
  })
  console.log(`✅ ${nfs.length} NFs encontradas`)

  // Montar linhas do Excel
  const headers = [
    'Cliente', 'REDUZIDO', 'BU', 'Filial', 'Semana', 'Mês',
    'Nº NF', 'Cód. Sist.', 'Emissão', 'Movim', 'E/S', 'CFOP',
    'Escopo', 'Processo', 'Ref', 'Dcto. Comercial',
    'Tot. Prod.', 'BC', 'ICMS ST', 'ICMS', 'ISS', 'PIS', 'COFINS', 'IPI', 'Tot. Nota',
  ]

  const dataRows = nfs.map(r => {
    const client   = r.clientId ? clientById[String(r.clientId)] : null
    const nome     = r.clientNameRaw || client?.name || ''
    const reduzido = client?.nameReduced || ''
    // BU: prioriza mapeamento por filial, depois buName salvo, depois entity do cliente
    const bu       = FILIAL_BU[Number(r.filial)] ?? r.buName ?? client?.entity ?? ''
    const semana   = WEEKS_PT[Number(r.weekOfMonth)] || '1ª Semana'
    const mes      = MONTHS_PT[Number(r.month)] || ''
    const emissao  = formatDate(r.emissionDate)

    return [
      nome,                          // Cliente
      reduzido,                      // REDUZIDO
      bu,                            // BU
      r.filial ?? '',                // Filial
      semana,                        // Semana
      mes,                           // Mês
      r.invoiceNumber || '',         // Nº NF (= DOC_COD do Conexos)
      '',                            // Cód. Sist. (FIS_NUM_DOCUMENTO - não sincronizado)
      emissao,                       // Emissão
      emissao,                       // Movim (igual à emissão - não sincronizado separado)
      r.scope || '',                 // E/S (TIPO_NF)
      '',                            // CFOP (não sincronizado)
      '',                            // Escopo (TIPO_PROCESSO - não sincronizado)
      r.processRef || '',            // Processo
      '',                            // Ref (REF_CLIENTE - não sincronizado)
      '',                            // Dcto. Comercial (não sincronizado)
      Number(r.totProduct  || 0),   // Tot. Prod.
      Number(r.totProduct  || 0),   // BC (usando Tot. Prod. como proxy)
      Number(r.icmsSt      || 0),   // ICMS ST
      Number(r.icms        || 0),   // ICMS
      0,                             // ISS (não sincronizado)
      Number(r.pis         || 0),   // PIS
      Number(r.cofins      || 0),   // COFINS
      Number(r.ipi         || 0),   // IPI
      Number(r.totNet      || 0),   // Tot. Nota
    ]
  })

  // Criar workbook
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('BaseContabil')

  const colWidths = [50, 16, 12, 8, 12, 12, 10, 10, 12, 12, 8, 10, 16, 10, 16, 16, 14, 14, 12, 12, 10, 10, 10, 10, 14]
  ws.columns = colWidths.map(width => ({ width }))

  ws.addRow(headers)
  for (const row of dataRows) ws.addRow(row)

  // Formatar colunas numéricas (17-25, 1-indexed no exceljs)
  const numericCols = [17, 18, 19, 20, 21, 22, 23, 24, 25]
  for (const c of numericCols) ws.getColumn(c).numFmt = '#,##0.00'

  const outPath = path.join(
    'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast',
    `base_conexos_oracle_${YEAR}.xlsx`
  )
  await wb.xlsx.writeFile(outPath)

  console.log(`\n✅ Excel gerado: ${outPath}`)
  console.log(`   ${dataRows.length} linhas | ${headers.length} colunas`)

  // Totais por BU
  const byBu = {}
  for (const r of dataRows) {
    const bu = r[2] || 'Sem BU'
    byBu[bu] = (byBu[bu] || 0) + r[24]
  }
  const totNota = dataRows.reduce((s, r) => s + r[24], 0)
  const totProd = dataRows.reduce((s, r) => s + r[16], 0)

  console.log('\n--- Totais por BU (Tot. Nota) ---')
  Object.entries(byBu)
    .sort((a, b) => b[1] - a[1])
    .forEach(([bu, v]) => {
      console.log(`  ${bu.padEnd(14)}: R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    })
  console.log(`\n  TOTAL           : R$ ${totNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Tot. Prod.      : R$ ${totProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

  console.log('\n⚠️  Colunas não disponíveis no Turso (precisam do Oracle):')
  console.log('   Cód. Sist. (FIS_NUM_DOCUMENTO), CFOP, Escopo, Ref, Dcto. Comercial, ISS, BC real')
  console.log(`   Para exportar completo: re-whitelist IP 177.92.64.206 no Conexos\n`)
}

main().catch(e => {
  console.error('\n❌ Erro:', e.message)
  process.exit(1)
})
