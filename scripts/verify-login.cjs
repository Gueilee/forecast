const { createClient } = require('@libsql/client')
const bcrypt = require('bcryptjs')

const db = createClient({
  url: process.argv[2],
  authToken: process.argv[3],
})

async function main() {
  const res = await db.execute(`SELECT id, email, name, role, isActive, password FROM "User"`)
  const user = res.rows[0]
  if (!user) { console.log('❌ Nenhum usuário encontrado'); return }

  console.log('Usuário:', user.email, '| role:', user.role, '| ativo:', user.isActive)
  console.log('Hash:', String(user.password).substring(0, 30) + '...')

  const ok = await bcrypt.compare('Vendemmia@2026', user.password)
  console.log('Senha Vendemmia@2026:', ok ? '✅ CORRETA' : '❌ INCORRETA')
}

main().catch(e => console.error('Erro conexão:', e.message))
