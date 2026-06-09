import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const jobs = await db.syncJob.findMany({
    orderBy: { startedAt: 'desc' },
    take: 30,
  })

  return NextResponse.json(jobs)
}
