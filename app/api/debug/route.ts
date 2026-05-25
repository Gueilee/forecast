import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const vars = {
    TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL ?? 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  }

  let dbStatus = 'untested'
  let userCount = 0
  try {
    userCount = await db.user.count()
    dbStatus = 'connected'
  } catch (e) {
    dbStatus = `error: ${(e as Error).message}`
  }

  return NextResponse.json({ vars, db: { status: dbStatus, userCount } })
}
