import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { clientId, year, month, comment } = await req.json() as {
    clientId: string
    year: number
    month: number
    comment: string
  }

  if (!clientId || !year || !month) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: clientId, year, month' }, { status: 400 })
  }

  const userId = (session.user as { id: string }).id

  // Upsert: um comentário por cliente/mês (weekOfMonth null = comentário do mês)
  const existing = await db.weekComment.findFirst({
    where: { clientId, year, month, weekOfMonth: null },
  })

  if (existing) {
    await db.weekComment.update({
      where: { id: existing.id },
      data: { comment: comment ?? '', userId },
    })
  } else {
    await db.weekComment.create({
      data: { clientId, year, month, weekOfMonth: null, comment: comment ?? '', userId },
    })
  }

  return NextResponse.json({ ok: true })
}
