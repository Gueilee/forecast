import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { db } from '@/lib/db'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { BuSummaryTable } from '@/components/dashboard/BuSummaryTable'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { MONTHS } from '@/lib/utils'

const YEAR = 2026
const CURRENT_MONTH = new Date().getMonth() + 1

async function getDashboardData() {
  const [budgetTotals, actualTotals, lastSync] = await Promise.all([
    db.budgetEntry.aggregate({
      where: { year: YEAR },
      _sum: { plan: true, fcMonth: true },
    }),
    db.actualWeekly.aggregate({
      where: { year: YEAR },
      _sum: { totFaturado: true, marginLiquid: true },
    }),
    db.syncJob.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { finishedAt: 'desc' },
    }),
  ])

  const planTotal = budgetTotals._sum.plan ?? 0
  const fcTotal = budgetTotals._sum.fcMonth ?? planTotal
  const faturadoYtd = actualTotals._sum.totFaturado ?? 0
  const marginYtd = actualTotals._sum.marginLiquid ?? 0

  const planYtd = await db.budgetEntry.aggregate({
    where: { year: YEAR, month: { lte: CURRENT_MONTH } },
    _sum: { plan: true },
  })
  const planYtdValue = planYtd._sum.plan ?? 0
  const atingimentoPct = planYtdValue > 0 ? (faturadoYtd / planYtdValue) * 100 : 0
  const mbPct = faturadoYtd > 0 ? (marginYtd / faturadoYtd) * 100 : 0

  // Monthly breakdown for chart
  const monthlyBudget = await db.budgetEntry.groupBy({
    by: ['month'],
    where: { year: YEAR },
    _sum: { plan: true, fcMonth: true },
    orderBy: { month: 'asc' },
  })

  const monthlyActual = await db.actualWeekly.groupBy({
    by: ['month'],
    where: { year: YEAR },
    _sum: { totFaturado: true },
    orderBy: { month: 'asc' },
  })

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const budget = monthlyBudget.find((b) => b.month === m)
    const actual = monthlyActual.find((a) => a.month === m)
    return {
      month: MONTHS[i].substring(0, 3),
      plano: Math.round((budget?._sum.plan ?? 0) / 1_000_000 * 10) / 10,
      fc: Math.round(((budget?._sum.fcMonth ?? budget?._sum.plan ?? 0)) / 1_000_000 * 10) / 10,
      realizado: Math.round((actual?._sum.totFaturado ?? 0) / 1_000_000 * 10) / 10,
    }
  })

  // BU summary
  const buData = await db.client.groupBy({
    by: ['entity'],
    where: { isActive: true, entity: { not: null } },
    _count: { id: true },
  })

  return {
    planTotal,
    fcTotal,
    faturadoYtd,
    atingimentoPct,
    mbPct,
    chartData,
    buData,
    lastSync: lastSync?.finishedAt ?? null,
  }
}

export default async function DashboardPage() {
  await getServerSession(authOptions)
  const data = await getDashboardData()

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Visão consolidada · Forecast ${YEAR}`}
      />
      <div className="p-6 space-y-6">
        <KpiCards
          planTotal={data.planTotal}
          fcTotal={data.fcTotal}
          faturadoYtd={data.faturadoYtd}
          atingimentoPct={data.atingimentoPct}
          mbPct={data.mbPct}
          lastSync={data.lastSync}
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RevenueChart data={data.chartData} />
          </div>
          <div>
            <BuSummaryTable />
          </div>
        </div>
      </div>
    </div>
  )
}
