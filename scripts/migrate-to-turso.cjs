/**
 * migrate-to-turso.cjs
 * Reads local SQLite (prisma/dev.db) via @libsql/client file: protocol
 * and writes everything to Turso.
 */

const { createClient } = require('@libsql/client')
const path = require('path')

const TURSO_URL   = process.argv[2] || process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.argv[3] || process.env.TURSO_AUTH_TOKEN
const LOCAL_PATH  = path.resolve(__dirname, '../prisma/dev.db')

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Usage: node migrate-to-turso.cjs <turso-url> <turso-token>')
  process.exit(1)
}

const src   = createClient({ url: `file:${LOCAL_PATH}` })
const dest  = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

// ─── DDL ──────────────────────────────────────────────────────────────────────
const DDL = [
`CREATE TABLE IF NOT EXISTS "User" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "email"     TEXT NOT NULL UNIQUE,
  "password"  TEXT NOT NULL,
  "role"      TEXT NOT NULL DEFAULT 'VIEWER',
  "isActive"  INTEGER NOT NULL DEFAULT 1,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS "Client" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "name"           TEXT NOT NULL,
  "nameReduced"    TEXT NOT NULL,
  "nameChart"      TEXT,
  "accountManager" TEXT,
  "commercialType" TEXT,
  "pl4Bu"          TEXT,
  "entity"         TEXT,
  "category"       TEXT,
  "categoryBkNv"   TEXT,
  "analytics"      INTEGER NOT NULL DEFAULT 0,
  "modality"       TEXT,
  "volumeRef"      REAL,
  "conexosCode"    INTEGER,
  "conexosName"    TEXT,
  "isActive"       INTEGER NOT NULL DEFAULT 1,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0 UNIQUE,
  "createdAt"      TEXT NOT NULL,
  "updatedAt"      TEXT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS "BudgetEntry" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "clientId"      TEXT NOT NULL,
  "year"          INTEGER NOT NULL,
  "month"         INTEGER NOT NULL,
  "plan"          REAL NOT NULL DEFAULT 0,
  "fcMonth"       REAL,
  "orders"        REAL,
  "withoutOrders" REAL,
  "mbPlanPct"     REAL,
  "mbFcPct"       REAL,
  "createdAt"     TEXT NOT NULL,
  "updatedAt"     TEXT NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE,
  UNIQUE ("clientId","year","month")
)`,
`CREATE INDEX IF NOT EXISTS "BudgetEntry_year_month_idx" ON "BudgetEntry"("year","month")`,
`CREATE TABLE IF NOT EXISTS "ActualNF" (
  "id"                TEXT NOT NULL PRIMARY KEY,
  "clientId"          TEXT,
  "conexosClientCode" INTEGER,
  "clientNameRaw"     TEXT NOT NULL,
  "buName"            TEXT,
  "filial"            INTEGER,
  "invoiceNumber"     TEXT NOT NULL,
  "emissionDate"      TEXT NOT NULL,
  "year"              INTEGER NOT NULL,
  "month"             INTEGER NOT NULL,
  "weekOfMonth"       INTEGER NOT NULL,
  "cfop"              TEXT,
  "scope"             TEXT,
  "processRef"        TEXT,
  "totProduct"        REAL NOT NULL DEFAULT 0,
  "totNet"            REAL NOT NULL DEFAULT 0,
  "icms"              REAL,
  "icmsSt"            REAL,
  "iss"               REAL,
  "pis"               REAL,
  "cofins"            REAL,
  "ipi"               REAL,
  "marginLiquid"      REAL,
  "source"            TEXT NOT NULL DEFAULT 'API',
  "syncJobId"         TEXT,
  "createdAt"         TEXT NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "Client"("id"),
  UNIQUE ("invoiceNumber","filial")
)`,
`CREATE INDEX IF NOT EXISTS "ActualNF_year_month_week_idx"     ON "ActualNF"("year","month","weekOfMonth")`,
`CREATE INDEX IF NOT EXISTS "ActualNF_clientId_year_month_idx" ON "ActualNF"("clientId","year","month")`,
`CREATE TABLE IF NOT EXISTS "ActualWeekly" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "clientId"     TEXT NOT NULL,
  "year"         INTEGER NOT NULL,
  "month"        INTEGER NOT NULL,
  "weekOfMonth"  INTEGER NOT NULL,
  "totFaturado"  REAL NOT NULL DEFAULT 0,
  "totProduct"   REAL NOT NULL DEFAULT 0,
  "icms"         REAL,
  "pis"          REAL,
  "cofins"       REAL,
  "ipi"          REAL,
  "marginLiquid" REAL,
  "updatedAt"    TEXT NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE,
  UNIQUE ("clientId","year","month","weekOfMonth")
)`,
`CREATE INDEX IF NOT EXISTS "ActualWeekly_year_month_idx" ON "ActualWeekly"("year","month")`,
`CREATE TABLE IF NOT EXISTS "ForecastRevision" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "clientId"  TEXT NOT NULL,
  "year"      INTEGER NOT NULL,
  "month"     INTEGER NOT NULL,
  "field"     TEXT NOT NULL,
  "oldValue"  REAL,
  "newValue"  REAL NOT NULL,
  "comment"   TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId")   REFERENCES "User"("id")
)`,
`CREATE INDEX IF NOT EXISTS "ForecastRevision_clientId_year_month_idx" ON "ForecastRevision"("clientId","year","month")`,
`CREATE TABLE IF NOT EXISTS "WeekComment" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "clientId"    TEXT NOT NULL,
  "year"        INTEGER NOT NULL,
  "month"       INTEGER NOT NULL,
  "weekOfMonth" INTEGER,
  "comment"     TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "createdAt"   TEXT NOT NULL,
  "updatedAt"   TEXT NOT NULL,
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId")   REFERENCES "User"("id")
)`,
`CREATE INDEX IF NOT EXISTS "WeekComment_clientId_year_month_idx" ON "WeekComment"("clientId","year","month")`,
`CREATE TABLE IF NOT EXISTS "SyncJob" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "status"         TEXT NOT NULL DEFAULT 'RUNNING',
  "recordsTotal"   INTEGER NOT NULL DEFAULT 0,
  "recordsNew"     INTEGER NOT NULL DEFAULT 0,
  "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
  "errors"         TEXT,
  "startedAt"      TEXT NOT NULL,
  "finishedAt"     TEXT,
  "triggeredBy"    TEXT
)`,
]

// ─── helpers ─────────────────────────────────────────────────────────────────
async function readAll(table) {
  const res = await src.execute(`SELECT * FROM "${table}"`)
  return res.rows
}

async function batchInsert(table, cols, rows, batchSize = 150) {
  if (!rows.length) { console.log(`  ${table}: 0 rows — skipped`); return }
  const ph  = cols.map(() => '?').join(', ')
  const sql = `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${ph})`
  let total = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize)
    const stmts = slice.map(row => ({
      sql,
      args: cols.map(c => row[c] ?? null),
    }))
    await dest.batch(stmts, 'write')
    total += slice.length
  }
  console.log(`  ${table}: ${total} rows ✓`)
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Turso migration starting…')
  console.log(`    ${TURSO_URL}\n`)

  await dest.execute('SELECT 1')
  console.log('✅  Connected to Turso\n')

  // 1. Create schema
  console.log('📐  Creating tables…')
  for (const ddl of DDL) {
    const name = (ddl.match(/TABLE.*?"(\w+)"/) || ddl.match(/INDEX.*?"(\w+)"/))?.[1] ?? '?'
    await dest.execute(ddl)
    process.stdout.write(`    ${name} ✓\n`)
  }

  // 2. Migrate data (FK order: User → Client → children)
  console.log('\n📦  Migrating data…')

  await batchInsert('User',
    ['id','name','email','password','role','isActive','createdAt','updatedAt'],
    await readAll('User'))

  await batchInsert('Client',
    ['id','name','nameReduced','nameChart','accountManager','commercialType','pl4Bu',
     'entity','category','categoryBkNv','analytics','modality','volumeRef',
     'conexosCode','conexosName','isActive','sortOrder','createdAt','updatedAt'],
    await readAll('Client'))

  await batchInsert('BudgetEntry',
    ['id','clientId','year','month','plan','fcMonth','orders','withoutOrders',
     'mbPlanPct','mbFcPct','createdAt','updatedAt'],
    await readAll('BudgetEntry'))

  await batchInsert('ActualNF',
    ['id','clientId','conexosClientCode','clientNameRaw','buName','filial',
     'invoiceNumber','emissionDate','year','month','weekOfMonth','cfop','scope',
     'processRef','totProduct','totNet','icms','icmsSt','iss','pis','cofins',
     'ipi','marginLiquid','source','syncJobId','createdAt'],
    await readAll('ActualNF'))

  await batchInsert('ActualWeekly',
    ['id','clientId','year','month','weekOfMonth','totFaturado','totProduct',
     'icms','pis','cofins','ipi','marginLiquid','updatedAt'],
    await readAll('ActualWeekly'))

  await batchInsert('ForecastRevision',
    ['id','clientId','year','month','field','oldValue','newValue','comment','userId','createdAt'],
    await readAll('ForecastRevision'))

  await batchInsert('WeekComment',
    ['id','clientId','year','month','weekOfMonth','comment','userId','createdAt','updatedAt'],
    await readAll('WeekComment'))

  await batchInsert('SyncJob',
    ['id','status','recordsTotal','recordsNew','recordsUpdated','errors','startedAt','finishedAt','triggeredBy'],
    await readAll('SyncJob'))

  // 3. Verify
  console.log('\n🔍  Verifying counts in Turso…')
  for (const t of ['User','Client','BudgetEntry','ActualNF','ActualWeekly','SyncJob']) {
    const r = await dest.execute(`SELECT COUNT(*) as n FROM "${t}"`)
    console.log(`    ${t}: ${r.rows[0].n}`)
  }

  console.log('\n✅  Migration complete!\n')
  process.exit(0)
}

main().catch(e => { console.error('\n❌ Error:', e.message); process.exit(1) })
