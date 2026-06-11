/**
 * Cria todas as tabelas do schema Prisma direto no Turso via libSQL.
 * Uso: node --env-file=.env scripts/init-turso.cjs
 *   ou: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/init-turso.cjs
 */
'use strict'

const { createClient } = require('@libsql/client')

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const DDL = [
  `CREATE TABLE IF NOT EXISTS User (
    id        TEXT     PRIMARY KEY,
    name      TEXT     NOT NULL,
    email     TEXT     NOT NULL UNIQUE,
    password  TEXT,
    role      TEXT     NOT NULL DEFAULT 'DIRETO',
    isActive  INTEGER  NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS PasswordToken (
    id        TEXT     PRIMARY KEY,
    token     TEXT     NOT NULL UNIQUE,
    userId    TEXT     NOT NULL,
    type      TEXT     NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS Client (
    id             TEXT     PRIMARY KEY,
    name           TEXT     NOT NULL,
    nameReduced    TEXT     NOT NULL,
    nameChart      TEXT,
    accountManager TEXT,
    commercialType TEXT,
    pl4Bu          TEXT,
    entity         TEXT,
    category       TEXT,
    categoryBkNv   TEXT,
    analytics      INTEGER  NOT NULL DEFAULT 0,
    modality       TEXT,
    volumeRef      REAL,
    conexosCode    INTEGER,
    conexosName    TEXT,
    isActive       INTEGER  NOT NULL DEFAULT 1,
    sortOrder      INTEGER  NOT NULL DEFAULT 0 UNIQUE,
    createdAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt      DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS BudgetEntry (
    id            TEXT     PRIMARY KEY,
    clientId      TEXT     NOT NULL,
    year          INTEGER  NOT NULL,
    month         INTEGER  NOT NULL,
    plan          REAL     NOT NULL DEFAULT 0,
    fcMonth       REAL,
    orders        REAL,
    withoutOrders REAL,
    mbPlanPct     REAL,
    mbFcPct       REAL,
    lastWeek      REAL,
    faturado      REAL,
    createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt     DATETIME NOT NULL,
    FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE CASCADE,
    UNIQUE (clientId, year, month)
  )`,

  `CREATE INDEX IF NOT EXISTS BudgetEntry_year_month ON BudgetEntry(year, month)`,

  `CREATE TABLE IF NOT EXISTS ActualNF (
    id                 TEXT     PRIMARY KEY,
    clientId           TEXT,
    conexosClientCode  INTEGER,
    clientNameRaw      TEXT     NOT NULL,
    buName             TEXT,
    filial             INTEGER,
    invoiceNumber      TEXT     NOT NULL,
    emissionDate       DATETIME NOT NULL,
    year               INTEGER  NOT NULL,
    month              INTEGER  NOT NULL,
    weekOfMonth        INTEGER  NOT NULL,
    cfop               TEXT,
    scope              TEXT,
    processRef         TEXT,
    totProduct         REAL     NOT NULL DEFAULT 0,
    totNet             REAL     NOT NULL DEFAULT 0,
    icms               REAL,
    icmsSt             REAL,
    iss                REAL,
    pis                REAL,
    cofins             REAL,
    ipi                REAL,
    marginLiquid       REAL,
    source             TEXT     NOT NULL DEFAULT 'API',
    syncJobId          TEXT,
    createdAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES Client(id),
    UNIQUE (invoiceNumber, filial)
  )`,

  `CREATE INDEX IF NOT EXISTS ActualNF_ymw ON ActualNF(year, month, weekOfMonth)`,
  `CREATE INDEX IF NOT EXISTS ActualNF_cym ON ActualNF(clientId, year, month)`,

  `CREATE TABLE IF NOT EXISTS ActualWeekly (
    id           TEXT     PRIMARY KEY,
    clientId     TEXT     NOT NULL,
    year         INTEGER  NOT NULL,
    month        INTEGER  NOT NULL,
    weekOfMonth  INTEGER  NOT NULL,
    totFaturado  REAL     NOT NULL DEFAULT 0,
    totProduct   REAL     NOT NULL DEFAULT 0,
    icms         REAL,
    pis          REAL,
    cofins       REAL,
    ipi          REAL,
    marginLiquid REAL,
    updatedAt    DATETIME NOT NULL,
    FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE CASCADE,
    UNIQUE (clientId, year, month, weekOfMonth)
  )`,

  `CREATE INDEX IF NOT EXISTS ActualWeekly_ym ON ActualWeekly(year, month)`,

  `CREATE TABLE IF NOT EXISTS ForecastRevision (
    id        TEXT     PRIMARY KEY,
    clientId  TEXT     NOT NULL,
    year      INTEGER  NOT NULL,
    month     INTEGER  NOT NULL,
    field     TEXT     NOT NULL,
    oldValue  REAL,
    newValue  REAL     NOT NULL,
    comment   TEXT     NOT NULL,
    userId    TEXT     NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE CASCADE,
    FOREIGN KEY (userId)   REFERENCES User(id)
  )`,

  `CREATE INDEX IF NOT EXISTS ForecastRevision_cym ON ForecastRevision(clientId, year, month)`,

  `CREATE TABLE IF NOT EXISTS WeekComment (
    id          TEXT     PRIMARY KEY,
    clientId    TEXT     NOT NULL,
    year        INTEGER  NOT NULL,
    month       INTEGER  NOT NULL,
    weekOfMonth INTEGER,
    comment     TEXT     NOT NULL,
    userId      TEXT     NOT NULL,
    createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME NOT NULL,
    FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE CASCADE,
    FOREIGN KEY (userId)   REFERENCES User(id)
  )`,

  `CREATE INDEX IF NOT EXISTS WeekComment_cym ON WeekComment(clientId, year, month)`,

  `CREATE TABLE IF NOT EXISTS SyncJob (
    id             TEXT     PRIMARY KEY,
    status         TEXT     NOT NULL DEFAULT 'RUNNING',
    recordsTotal   INTEGER  NOT NULL DEFAULT 0,
    recordsNew     INTEGER  NOT NULL DEFAULT 0,
    recordsUpdated INTEGER  NOT NULL DEFAULT 0,
    errors         TEXT,
    startedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finishedAt     DATETIME,
    triggeredBy    TEXT
  )`,
]

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error('❌  TURSO_DATABASE_URL não definido.')
    process.exit(1)
  }
  console.log('🔌  Conectando ao Turso:', process.env.TURSO_DATABASE_URL)
  console.log('⚙️   Criando tabelas...\n')

  for (const sql of DDL) {
    const name = sql.match(/(?:TABLE|INDEX)\s+(?:IF NOT EXISTS\s+)?(\w+)/i)?.[1] ?? '?'
    await db.execute(sql)
    console.log(`   ✓ ${name}`)
  }

  console.log('\n✅  Schema inicializado com sucesso!')
  await db.close()
}

main().catch(err => {
  console.error('❌  Erro:', err.message)
  process.exit(1)
})
