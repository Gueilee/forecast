import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email?.trim())
    return NextResponse.json({ error: 'Informe o e-mail' }, { status: 400 })

  // Sempre retorna 200 para não revelar se o e-mail existe
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, isActive: true },
  })

  if (user && user.isActive) {
    // Remove tokens de reset antigos e cria novo (válido por 1 hora)
    await db.passwordToken.deleteMany({ where: { userId: user.id, type: 'RESET' } })
    const token = crypto.randomBytes(32).toString('hex')
    await db.passwordToken.create({
      data: {
        token,
        userId: user.id,
        type: 'RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    try {
      await sendResetEmail(user.email, user.name, token)
    } catch (err) {
      console.error('[email] Falha ao enviar reset:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
