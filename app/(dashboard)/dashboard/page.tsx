import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { db } from '@/lib/db'
import { DashboardShell, type BuRowData } from '@/components/dashboard/DashboardShell'
import { MONTHS } from '@/lib/utils'

const YEAR          = 2026
const CURRENT_MONTH = new Date().getMonth() + 1

const BU_ENTITIES = ['VCI', 'ARM - GRV', 'ARM - ITV', 'ARM - NVG', 'TRP']

async function getDashboardData() {
  const [budgetTotals, actualYtd, planYtdAgg, lastSync, monthlyBudget, monthlyActual] = await Promise.all([
    db.budgetEntry.aggregate({ where: { year: YEAR }, _sum: { plan: true, fcMonth: true } }),
    db.actualNF.aggregate({ where: { year: YEAR, month: { lte: CURRENT_MONTH }, scope: 'SAÍDA' }, _sum: { totNet: true } }),
    db.budgetEntry.aggregate({ where: { year: YEAR, month: { lte: CURRENT_MONTH } }, _sum: { plan: true } }),
    db.syncJob.findFirst({ where: { status: 'DONE' }, orderBy: { finishedAt: 'desc' } }),
    db.budgetEntry.groupBy({ by: ['month'], where: { year: YEAR }, _sum: { plan: true, fcMonth: true }, orderBy: { month: 'asc' } }),
    db.actualNF.groupBy({ by: ['month'], where: { year: YEAR, scope: 'SAÍDA' }, _sum: { totNet: true }, orderBy: { month: 'asc' } }),
  ])

  const planTotal      = budgetTotals._sum.plan ?? 0
  const fcTotal        = budgetTotals._sum.fcMonth ?? planTotal
  const faturadoYtd    = actualYtd._sum.totNet ?? 0
  const planYtdValue   = planYtdAgg._sum.plan ?? 0
  const atingimentoPct = planYtdValue > 0 ? (faturadoYtd / planYtdValue) * 100 : 0

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m      = i + 1
    const budget = monthlyBudget.find(b => b.month === m)
    const actual = monthlyActual.find(a => a.month === m)
    return {
      month:     MONTHS[i].substring(0, 3),
      plano:     Math.round(((budget?._sum.plan    ?? 0)) / 1_000_000 * 10) / 10,
      fc:        Math.round(((budget?._sum.fcMonth ?? budget?._sum.plan ?? 0)) / 1_000_000 * 10) / 10,
      realizado: Math.round(((actual?._sum.totNet  ?? 0)) / 1_000_000 * 10) / 10,
    }
  })

  return { planTotal, fcTotal, faturadoYtd, atingimentoPct, mbPct: 0, chartData, lastSync: lastSync?.finishedAt ?? null }
}

async function getBuData(): Promise<BuRowData[]> {
  return Promise.all(
    BU_ENTITIES.map(async (entity) => {
      const [budgetAgg, ytdRow] = await Promise.all([
        db.budgetEntry.aggregate({
          where: { year: YEAR, month: { lte: CURRENT_MONTH }, client: { entity } },
          _sum: { plan: true, fcMonth: true },
        }),
        db.buYtdFaturado.findFirst({ where: { entity, year: YEAR } }),
      ])
      return {
        entity,
        plan:     budgetAgg._sum.plan    ?? 0,
        fc:       budgetAgg._sum.fcMonth ?? budgetAgg._sum.plan ?? 0,
        faturado: ytdRow?.faturadoYtd    ?? 0,
      }
    })
  )
}

export default async function DashboardPage() {
  await getServerSession(authOptions)

  const [data, clients, buData] = await Promise.all([
    getDashboardData(),
    db.client.findMany({
      where: { isActive: true },
      select: { id: true, entity: true, commercialType: true, modality: true, accountManager: true, nameReduced: true },
      orderBy: { nameReduced: 'asc' },
    }),
    getBuData(),
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
