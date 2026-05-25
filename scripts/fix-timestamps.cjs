/**
 * Converts Unix-ms timestamp columns to ISO 8601 strings in Turso.
 * Usage: node fix-timestamps.cjs <TURSO_URL> <TURSO_TOKEN>
 */
const { createClient } = require('@libsql/client')

const TURSO_URL   = process.argv[2]
const TURSO_TOKEN = process.argv[3]

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Usage: node fix-timestamps.cjs <turso-url> <turso-token>')
  process.exit(1)
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

// Tables and their DateTime columns
const TABLES = [
  { table: 'User',             cols: ['createdAt', 'updatedAt'] },
  { table: 'Client',           cols: ['createdAt', 'updatedAt'] },
  { table: 'BudgetEntry',      cols: ['createdAt', 'updatedAt'] },
  { table: 'ActualNF',         cols: ['emissionDate', 'createdAt'] },
  { table: 'ActualWeekly',     cols: ['updatedAt'] },
  { table: 'ForecastRevision', cols: ['createdAt'] },
  { table: 'WeekComment',      cols: ['createdAt', 'updatedAt'] },
  { table: 'SyncJob',          cols: ['startedAt', 'finishedAt'] },
]

// Convert ms-timestamp to ISO string using SQLite's strftime
// Only updates rows where the column does NOT already look like an ISO date
function buildSql(table, col) {
  return {
    sql: `
      UPDATE "${table}"
      SET "${col}" = strftime('%Y-%m-%dT%H:%M:%S.000Z',
                       CAST("${col}" AS REAL) / 1000.0,
                       'unixepoch')
      WHERE "${col}" IS NOT NULL
        AND "${col}" NOT LIKE '____-__-__T%'
    `,
    args: [],
  }
}

async function main() {
  for (const { table, cols } of TABLES) {
    // Check if table exists
    try {
      const count = await db.execute(`SELECT COUNT(*) as n FROM "${table}"`)
      const n = count.rows[0].n
      console.log(`\n${table}: ${n} rows`)

      if (Number(n) === 0) {
        console.log(`  → empty, skipping`)
        continue
      }

      // Preview first row before fix
      const preview = await db.execute(`SELECT ${cols.map(c => `"${c}"`).join(', ')} FROM "${table}" LIMIT 1`)
      console.log(`  before:`, preview.rows[0])

      for (const col of cols) {
        const result = await db.execute(buildSql(table, col))
        console.log(`  "${col}" → ${result.rowsAffected} rows updated`)
      }

      // Preview first row after fix
      const after = await db.execute(`SELECT ${cols.map(c => `"${c}"`).join(', ')} FROM "${table}" LIMIT 1`)
      console.log(`  after: `, after.rows[0])
    } catch (e) {
      console.log(`  ${table}: ${e.message}`)
    }
  }

  console.log('\n✅ Conversão concluída!')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
