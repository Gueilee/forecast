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
  const [budgetTotals, actualYtd, planYtdAgg, lastSync, monthlyBudget, monthlyActual] = await Promise.all([
    // Plano e FC anual
    db.budgetEntry.aggregate({
      where: { year: YEAR },
      _sum: { plan: true, fcMonth: true },
    }),
    // Faturado YTD real — apenas NFs de SAÍDA
    db.actualNF.aggregate({
      where: { year: YEAR, month: { lte: CURRENT_MONTH }, scope: 'SAÍDA' },
      _sum: { totNet: true },
    }),
    // Plano YTD
    db.budgetEntry.aggregate({
      where: { year: YEAR, month: { lte: CURRENT_MONTH } },
      _sum: { plan: true },
    }),
    // Último sync
    db.syncJob.findFirst({
      where: { status: 'DONE' },
      orderBy: { finishedAt: 'desc' },
    }),
    // Plano/FC por mês para o gráfico
    db.budgetEntry.groupBy({
      by: ['month'],
      where: { year: YEAR },
      _sum: { plan: true, fcMonth: true },
      orderBy: { month: 'asc' },
    }),
    // Faturado por mês — apenas NFs de SAÍDA
    db.actualNF.groupBy({
      by: ['month'],
      where: { year: YEAR, scope: 'SAÍDA' },
      _sum: { totNet: true },
      orderBy: { month: 'asc' },
    }),
  ])

  const planTotal     = budgetTotals._sum.plan ?? 0
  const fcTotal       = budgetTotals._sum.fcMonth ?? planTotal
  const faturadoYtd   = actualYtd._sum.totNet ?? 0
  const planYtdValue  = planYtdAgg._sum.plan ?? 0
  const atingimentoPct = planYtdValue > 0 ? (faturadoYtd / planYtdValue) * 100 : 0

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const budget = monthlyBudget.find(b => b.month === m)
    const actual = monthlyActual.find(a => a.month === m)
    return {
      month: MONTHS[i].substring(0, 3),
      plano:    Math.round(((budget?._sum.plan    ?? 0)) / 1_000_000 * 10) / 10,
      fc:       Math.round(((budget?._sum.fcMonth ?? budget?._sum.plan ?? 0)) / 1_000_000 * 10) / 10,
      realizado: Math.round(((actual?._sum.totNet ?? 0)) / 1_000_000 * 10) / 10,
    }
  })

  return {
    planTotal,
    fcTotal,
    faturadoYtd,
    atingimentoPct,
    mbPct: 0,
    chartData,
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
