const { createClient } = require('@libsql/client')

const db = createClient({
  url: 'libsql://forecast-gueilee.aws-us-east-1.turso.io',
  authToken: process.argv[2],
})

db.execute('SELECT COUNT(*) as n FROM "User"')
  .then(r => console.log('✅ Conexão OK — Users:', r.rows[0].n))
  .catch(e => console.error('❌ Falhou:', e.message))
