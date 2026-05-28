import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { token, password } = await req.json()

  if (!token || !password)
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  if (String(password).length < 6)
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })

  const record = await db.passwordToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, isActive: true } } },
  })

  if (!record)
    return NextResponse.json({ error: 'Link inválido ou já utilizado' }, { status: 400 })

  if (record.expiresAt < new Date())
    return NextResponse.json({ error: 'Link expirado. Solicite um novo.' }, { status: 400 })

  const hashed = await bcrypt.hash(String(password), 10)

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { password: hashed, isActive: true },
    }),
    db.passwordToken.delete({ where: { id: record.id } }),
  ])

  return NextResponse.json({ ok: true })
}

// Valida o token sem consumi-lo (para mostrar o formulário)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token)
    return NextResponse.json({ error: 'Token ausente' }, { status: 400 })

  const record = await db.passwordToken.findUnique({
    where: { token },
    select: { expiresAt: true, type: true, user: { select: { name: true, email: true } } },
  })

  if (!record || record.expiresAt < new Date())
    return NextResponse.json({ valid: false })

  return NextResponse.json({ valid: true, type: record.type, userName: record.user.name })
}
