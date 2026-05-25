import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTvData } from '@/lib/tv-data'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await getTvData()
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
