/**
 * Exporta dados do Conexos Oracle para Excel no mesmo formato da base_conexos.xlsx
 * 25 colunas: Cliente | REDUZIDO | BU | Filial | Semana | Mês | Nº NF | Cód. Sist. |
 *             Emissão | Movim | E/S | CFOP | Escopo | Processo | Ref | Dcto. Comercial |
 *             Tot. Prod. | BC | ICMS ST | ICMS | ISS | PIS | COFINS | IPI | Tot. Nota
 *
 * Usage: node export-conexos-base.cjs [ano]
 *   ex:  node export-conexos-base.cjs 2026
 */

const oracledb = require('oracledb')
const XLSX     = require('xlsx')
const path     = require('path')

const ORACLE_CONFIG = {
  user:          process.env.CONEXOS_USER     || 'CNXBI_VENDEMMIA',
  password:      process.env.CONEXOS_PASSWORD || '',
  connectString: `${process.env.CONEXOS_HOST || 'rds-vendemmia-uydge.conexos.cloud'}:${process.env.CONEXOS_PORT || '15003'}/${process.env.CONEXOS_SERVICE || 'CONEXOS'}`
}

if (!ORACLE_CONFIG.password) {
  console.error('❌ Erro: CONEXOS_PASSWORD não está definida no ambiente.')
  process.exit(1)
}

const YEAR = parseInt(process.argv[2]) || 2026

const MONTHS_PT = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKS_PT = ['', '1ª Semana', '2ª Semana', '3ª Semana', '4ª Semana', '5ª Semana']

function weekOfMonth(date) {
  return Math.min(Math.ceil(date.getDate() / 7), 5)
}

function formatDate(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

async function discoverColumns(conn) {
  console.log('\n🔍 Consultando colunas disponíveis na view...')
  const { rows } = await conn.execute(
    `SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS
     WHERE TABLE_NAME = 'VB_ANALISE_NF01' AND OWNER = 'VE3UB'
     ORDER BY COLUMN_ID`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )
  console.log('Colunas disponíveis:')
  rows.forEach(r => console.log(`  ${r.COLUMN_NAME} (${r.DATA_TYPE})`))
  return rows.map(r => r.COLUMN_NAME)
}

async function main() {
  console.log(`\n📊 Exportando dados Conexos ${YEAR} para Excel...\n`)

  const conn = await oracledb.getConnection(ORACLE_CONFIG)
  console.log('✅ Oracle conectado')

  // Descobrir colunas disponíveis
  const availableCols = await discoverColumns(conn)

  // Selecionar colunas com fallbacks
  const has = col => availableCols.includes(col)

  const selectParts = [
    'DOC_COD',
    'FIS_NUM_DOCUMENTO',
    'COD_CLIENTE',
    'CLIENTE',
    has('CLI_NOM_RED')  ? 'CLI_NOM_RED'  : `NULL AS CLI_NOM_RED`,
    has('CLI_REDUZIDO') ? 'CLI_REDUZIDO' : `NULL AS CLI_REDUZIDO`,
    'UND_NEGOCIO',
    has('FIL_COD')  ? 'FIL_COD'  : `NULL AS FIL_COD`,
    has('FIL_DES_FANTA') ? 'FIL_DES_FANTA' : `NULL AS FIL_DES_FANTA`,
    'FIS_DTA_EMISSAO',
    has('FIS_DTA_MOVIM') ? 'FIS_DTA_MOVIM' : `FIS_DTA_EMISSAO AS FIS_DTA_MOVIM`,
    'TIPO_NF',
    has('FIS_CFOP')  ? 'FIS_CFOP'  : (has('CFOP') ? 'CFOP' : `NULL AS FIS_CFOP`),
    has('TIPO_PROCESSO') ? 'TIPO_PROCESSO' : `NULL AS TIPO_PROCESSO`,
    'PROC_CNX',
    'REF_CLIENTE',
    has('DCT_NUM')        ? 'DCT_NUM'        : (has('NUM_DCT_COM') ? 'NUM_DCT_COM' : `NULL AS DCT_NUM`),
    has('DCT_REF_COM')    ? 'DCT_REF_COM'    : `NULL AS DCT_REF_COM`,
    'TOT_PRODUTOS',
    has('BC_ICMS')        ? 'BC_ICMS'        : (has('TOT_BC_ICMS') ? 'TOT_BC_ICMS' : `TOT_PRODUTOS AS BC_ICMS`),
    'VLR_MNY_ICMSST',
    'VLR_MNY_ICMS',
    has('VLR_MNY_ISS')    ? 'VLR_MNY_ISS'    : (has('VLR_ISS') ? 'VLR_ISS' : `0 AS VLR_MNY_ISS`),
    'VLR_MNY_PIS',
    'VLR_MNY_COFINS',
    'VLR_MNY_IPI',
    'TOT_LIQUIDO',
  ]

  console.log('\n📋 Executando query...')
  const { rows } = await conn.execute(
    `SELECT ${selectParts.join(', ')}
     FROM VE3UB.VB_ANALISE_NF01
     WHERE EXTRACT(YEAR FROM FIS_DTA_EMISSAO) = :y
     ORDER BY FIS_DTA_EMISSAO, DOC_COD`,
    { y: YEAR },
    { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 2000 }
  )
  console.log(`✅ ${rows.length} NFs encontradas`)

  // Montar dados para o Excel
  const headers = [
    'Cliente', 'REDUZIDO', 'BU', 'Filial', 'Semana', 'Mês',
    'Nº NF', 'Cód. Sist.', 'Emissão', 'Movim', 'E/S', 'CFOP',
    'Escopo', 'Processo', 'Ref', 'Dcto. Comercial',
    'Tot. Prod.', 'BC', 'ICMS ST', 'ICMS', 'ISS', 'PIS', 'COFINS', 'IPI', 'Tot. Nota',
  ]

  const dataRows = rows.map(r => {
    const emDate = r.FIS_DTA_EMISSAO instanceof Date ? r.FIS_DTA_EMISSAO : new Date(r.FIS_DTA_EMISSAO)
    const mvDate = r.FIS_DTA_MOVIM   instanceof Date ? r.FIS_DTA_MOVIM  : new Date(r.FIS_DTA_MOVIM)
    const sem    = WEEKS_PT[weekOfMonth(emDate)] || '1ª Semana'
    const mes    = MONTHS_PT[emDate.getMonth() + 1] || ''

    // Tentar obter nome reduzido: CLI_NOM_RED → CLI_REDUZIDO → null
    const reduzido = r.CLI_NOM_RED || r.CLI_REDUZIDO || ''

    // Filial: FIL_COD → FIL_DES_FANTA → ''
    const filial = r.FIL_COD ?? r.FIL_DES_FANTA ?? ''

    // CFOP
    const cfop = r.FIS_CFOP || r.CFOP || ''

    // Escopo
    const escopo = r.TIPO_PROCESSO || r.TIPO_NF || ''

    // Dcto. Comercial
    const dctCom = r.DCT_NUM || r.NUM_DCT_COM || r.DCT_REF_COM || ''

    return [
      r.CLIENTE           || '',          // Cliente
      reduzido,                            // REDUZIDO
      r.UND_NEGOCIO       || '',          // BU
      filial,                              // Filial
      sem,                                 // Semana
      mes,                                 // Mês
      r.FIS_NUM_DOCUMENTO || '',          // Nº NF
      r.DOC_COD           || '',          // Cód. Sist.
      formatDate(emDate),                  // Emissão
      formatDate(mvDate),                  // Movim
      r.TIPO_NF           || '',          // E/S
      cfop,                                // CFOP
      escopo,                              // Escopo
      r.PROC_CNX          || '',          // Processo
      r.REF_CLIENTE       || '',          // Ref
      dctCom,                              // Dcto. Comercial
      Number(r.TOT_PRODUTOS   || 0),      // Tot. Prod.
      Number(r.BC_ICMS        || r.TOT_BC_ICMS || r.TOT_PRODUTOS || 0), // BC
      Number(r.VLR_MNY_ICMSST || 0),     // ICMS ST
      Number(r.VLR_MNY_ICMS   || 0),     // ICMS
      Number(r.VLR_MNY_ISS    || r.VLR_ISS || 0), // ISS
      Number(r.VLR_MNY_PIS    || 0),     // PIS
      Number(r.VLR_MNY_COFINS || 0),     // COFINS
      Number(r.VLR_MNY_IPI    || 0),     // IPI
      Number(r.TOT_LIQUIDO    || 0),      // Tot. Nota
    ]
  })

  // Criar workbook
  const wb = XLSX.utils.book_new()
  const wsData = [headers, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Formatar colunas numéricas (índices 16-24)
  const numFmt = '#,##0.00'
  const numericCols = [16, 17, 18, 19, 20, 21, 22, 23, 24]
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let R = 1; R <= range.e.r; R++) {
    for (const C of numericCols) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      if (ws[addr]) {
        ws[addr].z = numFmt
      }
    }
  }

  // Larguras das colunas
  ws['!cols'] = [
    { wch: 50 }, // Cliente
    { wch: 16 }, // REDUZIDO
    { wch: 12 }, // BU
    { wch: 8  }, // Filial
    { wch: 12 }, // Semana
    { wch: 12 }, // Mês
    { wch: 10 }, // Nº NF
    { wch: 10 }, // Cód. Sist.
    { wch: 12 }, // Emissão
    { wch: 12 }, // Movim
    { wch: 8  }, // E/S
    { wch: 10 }, // CFOP
    { wch: 16 }, // Escopo
    { wch: 10 }, // Processo
    { wch: 16 }, // Ref
    { wch: 16 }, // Dcto. Comercial
    { wch: 14 }, // Tot. Prod.
    { wch: 14 }, // BC
    { wch: 12 }, // ICMS ST
    { wch: 12 }, // ICMS
    { wch: 10 }, // ISS
    { wch: 10 }, // PIS
    { wch: 10 }, // COFINS
    { wch: 10 }, // IPI
    { wch: 14 }, // Tot. Nota
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'BaseContabil')

  // Salvar na pasta do projeto
  const outPath = path.join(
    'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast',
    `base_conexos_oracle_${YEAR}.xlsx`
  )
  XLSX.writeFile(wb, outPath)

  console.log(`\n✅ Excel gerado: ${outPath}`)
  console.log(`   ${dataRows.length} linhas | ${headers.length} colunas`)

  // Totais para conferência
  const totNota  = dataRows.reduce((s, r) => s + r[24], 0)
  const totProd  = dataRows.reduce((s, r) => s + r[16], 0)
  console.log(`\nTotais:`)
  console.log(`  Tot. Nota : R$ ${totNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Tot. Prod.: R$ ${totProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

  await conn.close()
}

main().catch(e => {
  console.error('\n❌ Erro:', e.message)
  console.error(e.stack)
  process.exit(1)
})
