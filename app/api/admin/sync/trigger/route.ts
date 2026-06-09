import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import { join } from 'path'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const year  = body.year  ? String(parseInt(body.year))  : null
  const month = body.month ? String(parseInt(body.month)) : null

  const scriptPath = join(process.cwd(), 'scripts', 'sync-nf.cjs')
  const args: string[] = year ? (month ? [year, month] : [year]) : []

  try {
    const child = spawn('node', [scriptPath, ...args], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd(),
      env: process.env,
    })
    child.unref()

    const label = year ? (month ? `${year}/${month.padStart(2, '0')}` : `ano ${year}`) : 'ano atual'
    return NextResponse.json({ message: `Sync iniciado para ${label}`, pid: child.pid })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Falha ao iniciar sync: ${msg}` }, { status: 500 })
  }
}
