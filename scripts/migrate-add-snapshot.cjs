'use strict'
/**
 * Cria a tabela WeeklyForecastSnapshot no Turso.
 * Uso: node scripts/migrate-add-snapshot.cjs
 */
const { createClient } = require('@libsql/client')

const TURSO_URL   = process.env.TURSO_URL   || process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN

async function main() {
  if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('TURSO_URL e TURSO_TOKEN precisam estar configurados no ambiente.')
  }

  const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  console.log('✅ Turso conectado\n')

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS "WeeklyForecastSnapshot" (
      "id"        TEXT    NOT NULL PRIMARY KEY,
      "clientId"  TEXT    NOT NULL,
      "year"      INTEGER NOT NULL,
      "month"     INTEGER NOT NULL,
      "isoYear"   INTEGER NOT NULL,
      "isoWeek"   INTEGER NOT NULL,
      "fcValue"   REAL,
      "createdAt" TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )
  `)
  console.log('✅ Tabela WeeklyForecastSnapshot criada (ou já existia)')

  await turso.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      "WeeklyForecastSnapshot_clientId_isoYear_isoWeek_month_key"
    ON "WeeklyForecastSnapshot"("clientId", "isoYear", "isoWeek", "month")
  `)
  console.log('✅ Índice único (clientId, isoYear, isoWeek, month) criado')

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS
      "WeeklyForecastSnapshot_year_isoYear_isoWeek_idx"
    ON "WeeklyForecastSnapshot"("year", "isoYear", "isoWeek")
  `)
  console.log('✅ Índice de leitura (year, isoYear, isoWeek) criado')

  console.log('\n🎉 Migração concluída com sucesso!')
  process.exit(0)
}

main().catch(e => {
  console.error('\n❌ Erro:', e.message)
  process.exit(1)
})
