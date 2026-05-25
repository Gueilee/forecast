const oracledb = require('oracledb')
const CONFIG = { user: 'CNXBI_VENDEMMIA', password: 'BYBD3DBITDJY', connectString: 'rds-vendemmia-uydge.conexos.cloud:15003/CONEXOS' }

async function main() {
  const conn = await oracledb.getConnection(CONFIG)
  console.log('✅ Conectado\n')

  // Volume por ano/mês (2024–2026)
  console.log('=== FATURAMENTO POR MÊS (VB_ANALISE_NF01) ===')
  const { rows: vol } = await conn.execute(`
    SELECT EXTRACT(YEAR FROM FIS_DTA_EMISSAO)  AS ANO,
           EXTRACT(MONTH FROM FIS_DTA_EMISSAO) AS MES,
           COUNT(DISTINCT FIS_NUM_DOCUMENTO)   AS QTD_NF,
           SUM(TOT_LIQUIDO)                    AS FAT_LIQUIDO,
           SUM(TOT_PRODUTOS)                   AS FAT_PRODUTOS
    FROM VE3UB.VB_ANALISE_NF01
    WHERE FIS_DTA_EMISSAO >= DATE '2024-01-01'
    GROUP BY EXTRACT(YEAR FROM FIS_DTA_EMISSAO), EXTRACT(MONTH FROM FIS_DTA_EMISSAO)
    ORDER BY ANO, MES`,
    [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )
  vol.forEach(r => {
    const liq = Number(r.FAT_LIQUIDO || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    console.log(`  ${r.ANO}/${String(r.MES).padStart(2,'0')}: ${r.QTD_NF} NFs | Líquido: R$ ${liq}`)
  })

  // Sample 3 linhas de 2026
  console.log('\n=== SAMPLE 2026 ===')
  const { rows: sample, metaData } = await conn.execute(`
    SELECT * FROM VE3UB.VB_ANALISE_NF01
    WHERE FIS_DTA_EMISSAO >= DATE '2026-01-01'
      AND ROWNUM <= 3`,
    [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )
  console.log('Colunas:', metaData.map(c => c.name).join(', '))
  sample.forEach((r, i) => console.log(`[${i}]`, JSON.stringify(r)))

  // Tipos de NF (SAÍDA vs ENTRADA)
  console.log('\n=== TIPOS DE NF ===')
  const { rows: tipos } = await conn.execute(`
    SELECT TIPO_NF, COUNT(*) AS QTD
    FROM VE3UB.VB_ANALISE_NF01
    WHERE FIS_DTA_EMISSAO >= DATE '2025-01-01'
    GROUP BY TIPO_NF ORDER BY QTD DESC`,
    [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )
  tipos.forEach(r => console.log(`  ${r.TIPO_NF}: ${r.QTD}`))

  // Filiais disponíveis
  console.log('\n=== FILIAIS ===')
  const { rows: fils } = await conn.execute(`
    SELECT DISTINCT FIL_DES_FANTA FROM VE3UB.VB_ANALISE_NF01 ORDER BY 1`,
    [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )
  fils.forEach(r => console.log(`  ${r.FIL_DES_FANTA}`))

  await conn.close()
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
