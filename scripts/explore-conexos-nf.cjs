/**
 * Explora a estrutura e dados de faturamento do Conexos
 */
const oracledb = require('oracledb')

const CONFIG = {
  user:          process.env.CONEXOS_USER     || 'CNXBI_VENDEMMIA',
  password:      process.env.CONEXOS_PASSWORD || '',
  connectString: `${process.env.CONEXOS_HOST || 'rds-vendemmia-uydge.conexos.cloud'}:${process.env.CONEXOS_PORT || '15003'}/${process.env.CONEXOS_SERVICE || 'CONEXOS'}`
}

if (!CONFIG.password) {
  console.error('❌ Erro: CONEXOS_PASSWORD não está definida no ambiente.')
  process.exit(1)
}

async function query(conn, sql, label) {
  console.log(`\n=== ${label} ===`)
  try {
    const result = await conn.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows: 5,
    })
    console.log('Colunas:', result.metaData.map(c => c.name).join(', '))
    result.rows.forEach((r, i) => console.log(`  [${i}]`, JSON.stringify(r)))
    return result
  } catch (e) {
    console.log(`  ERRO: ${e.message}`)
  }
}

async function main() {
  const conn = await oracledb.getConnection(CONFIG)
  console.log('✅ Conectado\n')

  // 1. Estrutura da view VB_ANALISE_NF01 (principal de NF)
  await query(conn,
    `SELECT column_name, data_type, data_length
     FROM all_tab_columns
     WHERE table_name = 'VB_ANALISE_NF01'
       AND owner IN ('VE3UB','VE3UBH0M')
     ORDER BY column_id`,
    'COLUNAS DE VB_ANALISE_NF01'
  )

  // 2. Sample de dados de NF (2026)
  await query(conn,
    `SELECT * FROM VE3UB.VB_ANALISE_NF01
     WHERE ROWNUM <= 3
       AND EXTRACT(YEAR FROM DATA_EMISSAO) = 2026`,
    'SAMPLE VB_ANALISE_NF01 (2026)'
  )

  // 3. Volume por mês/ano (quantas NFs existem)
  console.log('\n=== VOLUME POR ANO/MÊS ===')
  try {
    const { rows } = await conn.execute(
      `SELECT EXTRACT(YEAR FROM DATA_EMISSAO) AS ANO,
              EXTRACT(MONTH FROM DATA_EMISSAO) AS MES,
              COUNT(*) AS QTD_NF,
              SUM(VLR_TOTAL_LIQUIDO) AS FAT_LIQUIDO
       FROM VE3UB.VB_ANALISE_NF01
       WHERE EXTRACT(YEAR FROM DATA_EMISSAO) >= 2024
       GROUP BY EXTRACT(YEAR FROM DATA_EMISSAO), EXTRACT(MONTH FROM DATA_EMISSAO)
       ORDER BY ANO, MES`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
    rows.forEach(r => console.log(`  ${r.ANO}/${String(r.MES).padStart(2,'0')}: ${r.QTD_NF} NFs | Fat. Líq.: R$ ${Number(r.FAT_LIQUIDO || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`))
  } catch (e) {
    console.log('  ERRO:', e.message)
  }

  // 4. Estrutura de VB_NOTAS (alternativa)
  await query(conn,
    `SELECT column_name, data_type
     FROM all_tab_columns
     WHERE table_name = 'VB_NOTAS'
       AND owner IN ('VE3UB','VE3UBH0M')
     ORDER BY column_id`,
    'COLUNAS DE VB_NOTAS'
  )

  await conn.close()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
