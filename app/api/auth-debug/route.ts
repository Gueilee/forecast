import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result: Record<string, unknown> = {
    env: {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL
        ? process.env.TURSO_DATABASE_URL.substring(0, 40) + '...'
        : 'NOT SET',
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN
        ? process.env.TURSO_AUTH_TOKEN.substring(0, 20) + '...'
        : 'NOT SET',
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
      `SELECT id, email, name, role, isActive, password FROM "User" LIMIT 1`
    )

    if (!userRes.rows.length) {
      result.db = { status: 'connected', user: 'NONE FOUND' }
      return NextResponse.json(result)
    }

    const user = userRes.rows[0]
    result.db = {
      status: 'connected',
      user: {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        hashPrefix: String(user.password).substring(0, 7),
      },
    }

    const passwordOk = await bcrypt.compare('Vendemmia@2026', String(user.password))
    result.passwordTest = passwordOk ? 'CORRETA ✓' : 'INCORRETA ✗'
  } catch (e) {
    result.db = { status: 'error', message: (e as Error).message }
  }

  // Test via Prisma (what the login actually uses)
  try {
    const prismaUser = await db.user.findUnique({
      where: { email: 'admin@vendemmia.com.br' },
    })
    result.prisma = prismaUser
      ? {
          status: 'ok',
          email: prismaUser.email,
          isActive: prismaUser.isActive,
          isActiveType: typeof prismaUser.isActive,
          hashPrefix: prismaUser.password.substring(0, 7),
        }
      : { status: 'user not found' }
  } catch (e) {
    result.prisma = { status: 'error', message: (e as Error).message }
  }

  return NextResponse.json(result)
}
