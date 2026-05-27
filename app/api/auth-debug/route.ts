import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result: Record<string, unknown> = {
    env: {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? 'CONFIGURED ✓' : 'NOT SET ✗',
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'CONFIGURED ✓' : 'NOT SET ✗',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET ✓' : 'NOT SET ✗',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
  }

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    result.error = 'Variáveis TURSO não configuradas'
    return NextResponse.json(result, { status: 500 })
  }

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    const userRes = await client.execute(
      `SELECT role, isActive FROM "User" LIMIT 1`
    )

    if (!userRes.rows.length) {
      result.db = { status: 'connected', user: 'NONE FOUND' }
      return NextResponse.json(result)
    }

    const user = userRes.rows[0]
    result.db = {
      status: 'connected',
      user: {
        role: user.role,
        isActive: user.isActive,
      },
    }
  } catch (e) {
    result.db = { status: 'error', message: (e as Error).message }
  }

  // Test via Prisma (what the login actually uses)
  try {
    const prismaUser = await db.user.findFirst({
      select: {
        role: true,
        isActive: true,
      }
    })
    result.prisma = prismaUser
      ? {
          status: 'ok',
          role: prismaUser.role,
          isActive: prismaUser.isActive,
          isActiveType: typeof prismaUser.isActive,
        }
      : { status: 'no users found' }
  } catch (e) {
    result.prisma = { status: 'error', message: (e as Error).message }
  }

  return NextResponse.json(result)
}
