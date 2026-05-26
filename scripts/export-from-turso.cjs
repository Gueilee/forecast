/**
 * Exporta NFs do Turso para Excel no mesmo formato da base_conexos.xlsx
 * Colunas financeiras completas; colunas sem equivalente em Turso ficam em branco.
 *
 * Usage: node export-from-turso.cjs [ano]
 */

const { createClient } = require('@libsql/client')
const XLSX = require('xlsx')
const path = require('path')

const TURSO_URL   = 'libsql://forecast-gueilee.aws-us-east-1.turso.io'
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk2Nzk0NzYsImlkIjoiMDE5ZTVkMTEtZGMwMS03M2JjLWIyOTgtODFjOWM3NjkwY2M5IiwicmlkIjoiNGY0MDU0ZDQtYzliNS00MjljLTk5NjktNzg4NjY0YjZmYWM3In0.2_yL5h_ExuVFtIGcRf9b3j8HTLcmqm5-AbMO5m2mryR-C9jBCvpCaj0HURaspduQpf4BsX00E0O1QCjJOd1VBQ'

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
  const wb  = XLSX.utils.book_new()
  const ws  = XLSX.utils.aoa_to_sheet([headers, ...dataRows])

  // Formatar colunas numéricas (16-24)
  const numFmt     = '#,##0.00'
  const numericIdx = [16, 17, 18, 19, 20, 21, 22, 23, 24]
  const wsRange    = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let R = 1; R <= wsRange.e.r; R++) {
    for (const C of numericIdx) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      if (ws[addr]) ws[addr].z = numFmt
    }
  }

  ws['!cols'] = [
    { wch: 50 }, { wch: 16 }, { wch: 12 }, { wch: 8 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 8  }, { wch: 10 },
    { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'BaseContabil')

  const outPath = path.join(
    'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast',
    `base_conexos_oracle_${YEAR}.xlsx`
  )
  XLSX.writeFile(wb, outPath)

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
