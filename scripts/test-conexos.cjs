/**
 * Testa conexão com Oracle Conexos e lista tabelas/views disponíveis
 * Usage: node test-conexos.cjs
 */
const oracledb = require('oracledb')

// Thin mode: não chamar initOracleClient() — sem dependência do Oracle Instant Client

const CONFIG = {
  user:        process.env.CONEXOS_USER     || 'CNXBI_VENDEMMIA',
  password:    process.env.CONEXOS_PASSWORD || '',
  connectString: `${process.env.CONEXOS_HOST || 'rds-vendemmia-uydge.conexos.cloud'}:${process.env.CONEXOS_PORT || '15003'}/${process.env.CONEXOS_SERVICE || 'CONEXOS'}`,
}

if (!CONFIG.password) {
  console.error('❌ Erro: CONEXOS_PASSWORD não está definida no ambiente.')
  process.exit(1)
}

async function main() {
  console.log('Conectando em:', CONFIG.connectString)
  console.log('Usuário:', CONFIG.user)

  let conn
  try {
    conn = await oracledb.getConnection(CONFIG)
    console.log('\n✅ Conexão OK!\n')
  } catch (e) {
    console.error('❌ Falhou na conexão:', e.message)
    process.exit(1)
  }

  // Listar todas as tabelas/views acessíveis por este usuário
  console.log('=== TABELAS E VIEWS DISPONÍVEIS ===')
  const { rows: tables } = await conn.execute(
    `SELECT owner, object_name, object_type
     FROM all_objects
     WHERE object_type IN ('TABLE','VIEW','SYNONYM')
       AND status = 'VALID'
     ORDER BY owner, object_type, object_name`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 200 }
  )
  tables.forEach(r => console.log(`  [${r.OBJECT_TYPE}] ${r.OWNER}.${r.OBJECT_NAME}`))

  // Buscar views/tabelas com "FAT" ou "NF" ou "FATUR" no nome (faturamento)
  console.log('\n=== OBJETOS RELACIONADOS A FATURAMENTO ===')
  const { rows: fatRows } = await conn.execute(
    `SELECT owner, object_name, object_type
     FROM all_objects
     WHERE (UPPER(object_name) LIKE '%FAT%'
        OR UPPER(object_name) LIKE '%NF%'
        OR UPPER(object_name) LIKE '%NFIS%'
        OR UPPER(object_name) LIKE '%INVOICE%'
        OR UPPER(object_name) LIKE '%NOTA%'
        OR UPPER(object_name) LIKE '%BILLING%')
       AND status = 'VALID'
     ORDER BY object_type, object_name`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )
  if (fatRows.length === 0) {
    console.log('  (nenhum encontrado com esses filtros)')
  } else {
    fatRows.forEach(r => console.log(`  [${r.OBJECT_TYPE}] ${r.OWNER}.${r.OBJECT_NAME}`))
  }

  await conn.close()
}

main().catch(e => { console.error('Erro geral:', e.message); process.exit(1) })
