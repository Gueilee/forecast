import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

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

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await props.params
  const { name, role, isActive, password } = await req.json()

  if (role && !VALID_ROLES.includes(role))
    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })

  if (id === session.user.id && (isActive === false || (role && role !== 'ADMIN')))
    return NextResponse.json({ error: 'Não é possível alterar sua própria conta de admin' }, { status: 400 })

  if (password && String(password).length < 6)
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (name     !== undefined) data.name     = String(name).trim()
  if (role     !== undefined) data.role     = role
  if (isActive !== undefined) data.isActive = isActive
  if (password) data.password = await bcrypt.hash(String(password), 10)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, password: true },
  })
  return NextResponse.json(toUserRow(user))
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await props.params

  if (id === session.user.id)
    return NextResponse.json({ error: 'Não é possível excluir sua própria conta' }, { status: 400 })

  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
