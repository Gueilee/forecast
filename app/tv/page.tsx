import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { MONTHS, MONTH_SHORT } from '@/lib/utils'
import { TvDashboard } from '@/components/tv/TvDashboard'
import type { TvData } from '@/components/tv/types'

const YEAR = 2026

async function getTvData(): Promise<TvData> {
  const currentMonth = new Date().getMonth() + 1

  const [budgetEntries, actuals, clients] = await Promise.all([
    db.budgetEntry.findMany({
      where: { year: YEAR },
      select: {
        clientId: true, month: true, plan: true, fcMonth: true,
        client: { select: { entity: true } },
      },
    }),
    db.actualWeekly.findMany({
      where: { year: YEAR },
      select: {
        clientId: true, month: true, totFaturado: true, marginLiquid: true,
        client: { select: { entity: true } },
      },
    }),
    db.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameReduced: true, entity: true },
    }),
  ])

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const entries = budgetEntries.filter(e => e.month === m)
    const acts = actuals.filter(a => a.month === m)
    return {
      month: m,
      short: MONTH_SHORT[i],
      plan: entries.reduce((s, e) => s + e.plan, 0),
      fc: entries.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0),
      realizado: acts.reduce((s, a) => s + a.totFaturado, 0),
    }
  })

  const entityOrder = ['VCI', 'ARM-GRV', 'ARM-ITV', 'ARM-NVG', 'TRP']
  const entitySet = new Set(clients.map(c => c.entity).filter(Boolean) as string[])
  const entityList = entityOrder.filter(e => entitySet.has(e))
    .concat([...entitySet].filter(e => !entityOrder.includes(e)))

  const entities = entityList.map(entity => {
    const ytdE = budgetEntries.filter(e => e.client.entity === entity && e.month <= currentMonth)
    const monthE = budgetEntries.filter(e => e.client.entity === entity && e.month === currentMonth)
    const ytdA = actuals.filter(a => a.client.entity === entity && a.month <= currentMonth)
    const monthA = actuals.filter(a => a.client.entity === entity && a.month === currentMonth)
    const planYtd = ytdE.reduce((s, e) => s + e.plan, 0)
    const fcYtd = ytdE.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0)
    const realizadoYtd = ytdA.reduce((s, a) => s + a.totFaturado, 0)
    return {
      entity,
      planYtd,
      fcYtd,
      realizadoYtd,
      atingimento: planYtd > 0 ? (realizadoYtd / planYtd) * 100 : 0,
      planMonth: monthE.reduce((s, e) => s + e.plan, 0),
      fcMonth: monthE.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0),
      realizadoMonth: monthA.reduce((s, a) => s + a.totFaturado, 0),
    }
  })

  const allClients = clients.map(client => {
    const entries = budgetEntries.filter(e => e.clientId === client.id && e.month <= currentMonth)
    const acts = actuals.filter(a => a.clientId === client.id && a.month <= currentMonth)
    const planYtd = entries.reduce((s, e) => s + e.plan, 0)
    const realizadoYtd = acts.reduce((s, a) => s + a.totFaturado, 0)
    return {
      clientId: client.id,
      name: client.name,
      nameReduced: client.nameReduced || client.name,
      entity: client.entity ?? '',
      realizadoYtd,
      planYtd,
      atingimento: planYtd > 0 ? (realizadoYtd / planYtd) * 100 : 0,
    }
  })

  const ytdMonthly = monthly.filter(m => m.month <= currentMonth)
  const planYtd = ytdMonthly.reduce((s, m) => s + m.plan, 0)
  const realizadoYtd = ytdMonthly.reduce((s, m) => s + m.realizado, 0)
  const marginYtd = actuals.filter(a => a.month <= currentMonth).reduce((s, a) => s + (a.marginLiquid ?? 0), 0)
  const monthData = monthly[currentMonth - 1]

  return {
    year: YEAR,
    currentMonth,
    currentMonthName: MONTHS[currentMonth - 1],
    planYear: monthly.reduce((s, m) => s + m.plan, 0),
    fcYear: monthly.reduce((s, m) => s + m.fc, 0),
    realizadoYtd,
    planYtd,
    atingimentoYtd: planYtd > 0 ? (realizadoYtd / planYtd) * 100 : 0,
    marginYtd,
    marginPct: realizadoYtd > 0 ? (marginYtd / realizadoYtd) * 100 : 0,
    planMonth: monthData.plan,
    fcMonth: monthData.fc,
    realizadoMonth: monthData.realizado,
    atingimentoMonth: monthData.plan > 0 ? (monthData.realizado / monthData.plan) * 100 : 0,
    monthly,
    entities,
    topClients: allClients.filter(c => c.planYtd > 0).sort((a, b) => b.planYtd - a.planYtd).slice(0, 10),
    updatedAt: new Date().toISOString(),
  }
}

export default async function TvPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const data = await getTvData()
  return <TvDashboard initialData={data} />
}
