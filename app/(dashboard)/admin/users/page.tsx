import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Header } from '@/components/layout/Header'
import { UsersManager } from '@/components/admin/UsersManager'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')

  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, password: true },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <Header title="Usuários" subtitle="Gestão de acessos e perfis" />
      <UsersManager
        initial={users.map(u => ({
          id: u.id, name: u.name, email: u.email,
          role: u.role, isActive: u.isActive,
          createdAt: u.createdAt.toISOString(),
          pendingActivation: u.password === null,
        }))}
        currentUserId={session.user.id}
      />
    </div>
  )
}
