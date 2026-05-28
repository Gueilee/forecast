import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { db } from '@/lib/db'
import { PlanTable } from '@/components/admin/PlanTable'

export default async function PlanPage() {
  const session = await getServerSession(authOptions)
  if (!session || !['DIRETO', 'CONTABIL', 'OPERACOES', 'ADMIN'].includes(session.user.role)) redirect('/dashboard')

  const clients = await db.client.findMany({
    where: { isActive: true },
    include: {
      budgetEntries: {
        where: { year: 2026 },
        orderBy: { month: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return (
    <div>
      <Header
        title="Gestão do Plano Orçamentário"
        subtitle={`${clients.length} linhas importadas · Forecast 2026`}
      />
      <div className="p-6">
        <PlanTable clients={clients} />
      </div>
    </div>
  )
}
