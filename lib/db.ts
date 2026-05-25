// lib/db.ts
// Development  → SQLite local via DATABASE_URL
// Production   → Turso via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN

import { PrismaClient } from '../app/generated/prisma'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function buildClient(): PrismaClient {
  // Turso (production / staging)
  if (process.env.TURSO_DATABASE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client') as typeof import('@libsql/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql') as typeof import('@prisma/adapter-libsql')
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
  }

  // Local SQLite
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db: PrismaClient = globalThis.__prisma ?? buildClient()

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = db
