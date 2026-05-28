import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const VALID_ROLES = ['ADMIN', 'DIRETO', 'CONTABIL', 'OPERACOES']

const SELECT = {
  id: true, name: true, email: true,
  role: true, isActive: true, createdAt: true,
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const users = await db.user.findMany({
    select: SELECT,
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { name, email, password, role } = await req.json()

  if (!name?.trim() || !email?.trim() || !password || !role)
    return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })

  if (!VALID_ROLES.includes(role))
    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })

  if (String(password).length < 6)
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (existing)
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })

  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(String(password), 10),
      role,
    },
    select: SELECT,
  })
  return NextResponse.json(user, { status: 201 })
}
