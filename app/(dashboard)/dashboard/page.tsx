import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { db } from '@/lib/db'
import { DashboardShell, type BuRowData } from '@/components/dashboard/DashboardShell'
import { MONTHS } from '@/lib/utils'

const YEAR          = 2026
const CURRENT_MONTH = new Date().getMonth() + 1

const BU_ENTITIES = ['VCI', 'ARM - GRV', 'ARM - ITV', 'ARM - NVG', 'TRP']

async function getDashboardData(activeClientIds: string[]) {
  const [budgetTotals, faturadoAgg, lastSync, monthlyBudget] = await Promise.all([
    db.budgetEntry.aggregate({ where: { year: YEAR, clientId: { in: activeClientIds } }, _sum: { plan: true, fcMonth: true } }),
    db.budgetEntry.aggregate({ where: { year: YEAR, clientId: { in: activeClientIds } }, _sum: { faturado: true } }),
    db.syncJob.findFirst({ where: { status: 'DONE' }, orderBy: { finishedAt: 'desc' } }),
    db.budgetEntry.groupBy({ by: ['month'], where: { year: YEAR, clientId: { in: activeClientIds } }, _sum: { plan: true, fcMonth: true, faturado: true }, orderBy: { month: 'asc' } }),
  ])

  const planTotal      = budgetTotals._sum.plan ?? 0
  const fcTotal        = budgetTotals._sum.fcMonth ?? planTotal
  const faturadoYtd    = faturadoAgg._sum.faturado ?? 0
  const atingimentoPct = planTotal > 0 ? (faturadoYtd / planTotal) * 100 : 0

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m      = i + 1
    const budget = monthlyBudget.find(b => b.month === m)
    return {
      month:     MONTHS[i].substring(0, 3),
      plano:     Math.round(((budget?._sum.plan     ?? 0)) / 1_000_000 * 10) / 10,
      fc:        Math.round(((budget?._sum.fcMonth  ?? budget?._sum.plan ?? 0)) / 1_000_000 * 10) / 10,
      realizado: Math.round(((budget?._sum.faturado ?? 0)) / 1_000_000 * 10) / 10,
    }
  })

  return { planTotal, fcTotal, faturadoYtd, atingimentoPct, mbPct: 0, chartData, lastSync: lastSync?.finishedAt ?? null }
}

async function getBuData(activeClients: { id: string; entity: string | null }[]): Promise<BuRowData[]> {
  return Promise.all(
    BU_ENTITIES.map(async (entity) => {
      const entityIds = activeClients.filter(c => c.entity === entity).map(c => c.id)
      const agg = await db.budgetEntry.aggregate({
        where: { year: YEAR, clientId: { in: entityIds } },
        _sum: { plan: true, fcMonth: true, faturado: true },
      })
      return {
        entity,
        plan:     agg._sum.plan     ?? 0,
        fc:       agg._sum.fcMonth  ?? agg._sum.plan ?? 0,
        faturado: agg._sum.faturado ?? 0,
      }
    })
  )
}

export default async function DashboardPage() {
  await getServerSession(authOptions)

  const clients = await db.client.findMany({
    where: { isActive: true },
    select: { id: true, entity: true, commercialType: true, modality: true, accountManager: true, nameReduced: true },
    orderBy: { nameReduced: 'asc' },
  })

  const activeClientIds = clients.map(c => c.id)

  const [data, buData] = await Promise.all([
    getDashboardData(activeClientIds),
    getBuData(clients),
  ])

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Visão consolidada · Forecast ${YEAR}`}
      />
      <DashboardShell
        kpiData={{
          planTotal:      data.planTotal,
          fcTotal:        data.fcTotal,
          faturadoYtd:    data.faturadoYtd,
          atingimentoPct: data.atingimentoPct,
          mbPct:          data.mbPct,
          lastSync:       data.lastSync,
        }}
        chartData={data.chartData}
        clients={clients}
        buData={buData}
        currentMonth={CURRENT_MONTH}
      />
    </div>
  )
}
