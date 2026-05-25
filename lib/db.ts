import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function buildClient(): PrismaClient {
  // Production / staging: Turso via libsql driver adapter
  if (process.env.TURSO_DATABASE_URL) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
  }

  // Development: local SQLite
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db: PrismaClient = globalThis.__prisma ?? buildClient()

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = db
