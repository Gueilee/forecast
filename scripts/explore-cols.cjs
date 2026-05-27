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

async function main() {
  const conn = await oracledb.getConnection(CONFIG)

  for (const view of ['VB_ANALISE_NF01', 'VB_NOTAS', 'VB_NOTAS02']) {
    const r = await conn.execute(
      `SELECT column_name, data_type FROM all_tab_columns WHERE table_name = :v AND owner = 'VE3UB' ORDER BY column_id`,
      { v: view },
      { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 100 }
    )
    console.log(`\n${view}: ${r.rows.map(c => c.COLUMN_NAME + '(' + c.DATA_TYPE + ')').join(', ')}`)
  }

  // Sample row to see real values
  console.log('\n--- SAMPLE VB_NOTAS ---')
  const s = await conn.execute('SELECT * FROM VE3UB.VB_NOTAS WHERE ROWNUM <= 2', [], { outFormat: oracledb.OUT_FORMAT_OBJECT })
  console.log('Cols:', s.metaData.map(c => c.name).join(', '))
  s.rows.forEach((r, i) => console.log(`[${i}]`, JSON.stringify(r)))

  await conn.close()
}
main().catch(e => { console.error(e.message); process.exit(1) })
