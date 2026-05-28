import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendInviteEmail } from '@/lib/email'
import crypto from 'crypto'

const VALID_ROLES = ['ADMIN', 'DIRETO', 'CONTABIL', 'OPERACOES']

function toUserRow(u: {
  id: string; name: string; email: string
  role: string; isActive: boolean; createdAt: Date; password: string | null
}) {
  return {
    id: u.id, name: u.name, email: u.email,
    role: u.role, isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    pendingActivation: u.password === null,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, password: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users.map(toUserRow))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { name, email, role } = await req.json()

  if (!name?.trim() || !email?.trim() || !role)
    return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })

  if (!VALID_ROLES.includes(role))
    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (existing)
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: null,
      role,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, password: true },
  })

  // Gera token de convite (válido por 7 dias)
  const token = crypto.randomBytes(32).toString('hex')
  await db.passwordToken.create({
    data: {
      token,
      userId: user.id,
      type: 'INVITE',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  try {
    await sendInviteEmail(user.email, user.name, token)
  } catch (err) {
    console.error('[email] Falha ao enviar convite:', err)
  }

  return NextResponse.json(toUserRow(user), { status: 201 })
}
