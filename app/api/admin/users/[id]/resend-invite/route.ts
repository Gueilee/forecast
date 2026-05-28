import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendInviteEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(
  _req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await props.params

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, password: true },
  })

  if (!user)
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  if (user.password !== null)
    return NextResponse.json({ error: 'Usuário já ativou a conta' }, { status: 400 })

  // Remove tokens antigos e cria novo
  await db.passwordToken.deleteMany({ where: { userId: id, type: 'INVITE' } })
  const token = crypto.randomBytes(32).toString('hex')
  await db.passwordToken.create({
    data: {
      token,
      userId: id,
      type: 'INVITE',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  try {
    await sendInviteEmail(user.email, user.name, token)
  } catch (err) {
    console.error('[email] Falha ao reenviar convite:', err)
    return NextResponse.json({ error: 'Falha ao enviar e-mail' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
