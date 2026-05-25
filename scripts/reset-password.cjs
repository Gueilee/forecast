const { createClient } = require('@libsql/client')
const bcrypt = require('bcryptjs')

const TURSO_URL   = process.argv[2]
const TURSO_TOKEN = process.argv[3]
const NEW_PASS    = process.argv[4]

if (!TURSO_URL || !TURSO_TOKEN || !NEW_PASS) {
  console.error('Usage: node reset-password.cjs <url> <token> <new-password>')
  process.exit(1)
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

bcrypt.hash(NEW_PASS, 12).then(async hash => {
  await db.execute({ sql: `UPDATE "User" SET password = ? WHERE email = 'admin@vendemmia.com.br'`, args: [hash] })
  console.log('✅ Senha atualizada com sucesso!')
  process.exit(0)
}).catch(e => { console.error(e.message); process.exit(1) })
