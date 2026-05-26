import { db } from '@/lib/db'
import { MONTHS, MONTH_SHORT } from '@/lib/utils'
import type { TvData, TvMonthly, TvEntity, TvClient } from '@/components/tv/types'

const YEAR = 2026
// Entidades na ordem de exibição — formato exato do banco
export const ENTITY_ORDER = ['VCI', 'ARM - GRV', 'ARM - ITV', 'ARM - NVG', 'TRP']

export async function getTvData(): Promise<TvData> {
  const currentMonth = new Date().getMonth() + 1

  const [
    budgetEntries,
    monthlyActual,
    entityMonthlyActual,
    clientActuals,
    clients,
  ] = await Promise.all([
    // Plano/FC por cliente+mês
    db.budgetEntry.findMany({
      where: { year: YEAR },
      select: {
        clientId: true, month: true, plan: true, fcMonth: true,
        client: { select: { entity: true } },
      },
    }),

    // Faturado por mês — apenas NFs de SAÍDA
    db.actualNF.groupBy({
      by: ['month'],
      where: { year: YEAR, scope: 'SAÍDA' },
      _sum: { totNet: true },
      orderBy: { month: 'asc' },
    }),

    // Faturado por BU+mês — apenas NFs de SAÍDA
    db.actualNF.groupBy({
      by: ['buName', 'month'],
      where: { year: YEAR, buName: { not: null }, scope: 'SAÍDA' },
      _sum: { totNet: true },
    }),

    // Faturado por cliente linkado — apenas NFs de SAÍDA
    db.actualNF.groupBy({
      by: ['clientId'],
      where: { year: YEAR, month: { lte: currentMonth }, clientId: { not: null }, scope: 'SAÍDA' },
      _sum: { totNet: true },
      orderBy: { _sum: { totNet: 'desc' } },
    }),

    // Lista de clientes ativos
    db.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameReduced: true, entity: true },
    }),
  ])

  // Monthly chart (12 meses)
  const monthly: TvMonthly[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const entries = budgetEntries.filter(e => e.month === m)
    const actual = monthlyActual.find(a => a.month === m)
    return {
      month: m,
      short: MONTH_SHORT[i],
      plan: entries.reduce((s, e) => s + e.plan, 0),
      fc: entries.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0),
      realizado: actual?._sum.totNet ?? 0,
    }
  })

  // Entidades disponíveis no sistema
  const entitySet = new Set(clients.map(c => c.entity).filter(Boolean) as string[])
  const entityList = ENTITY_ORDER.filter(e => entitySet.has(e))

  // Resumo por entidade
  const entities: TvEntity[] = entityList.map(entity => {
    const ytdBudget  = budgetEntries.filter(e => e.client.entity === entity && e.month <= currentMonth)
    const yearBudget = budgetEntries.filter(e => e.client.entity === entity)
    const monthBudget = budgetEntries.filter(e => e.client.entity === entity && e.month === currentMonth)

    const planYtd  = ytdBudget.reduce((s, e) => s + e.plan, 0)
    const fcYtd    = yearBudget.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0)
    const planMonth = monthBudget.reduce((s, e) => s + e.plan, 0)
    const fcMonth   = monthBudget.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0)

    // Realizado da entidade vem de ActualNF.buName
    const realizadoYtd = entityMonthlyActual
      .filter(a => a.buName === entity && (a.month ?? 0) <= currentMonth)
      .reduce((s, a) => s + (a._sum.totNet ?? 0), 0)

    const realizadoMonth = entityMonthlyActual
      .filter(a => a.buName === entity && a.month === currentMonth)
      .reduce((s, a) => s + (a._sum.totNet ?? 0), 0)

    return {
      entity,
      planYtd,
      fcYtd,
      realizadoYtd,
      atingimento: planYtd > 0 ? (realizadoYtd / planYtd) * 100 : 0,
      planMonth,
      fcMonth,
      realizadoMonth,
    }
  })

  // Top clientes por faturado YTD (clientes linkados)
  const clientMap = new Map(clients.map(c => [c.id, c]))
  const budgetByClient = new Map<string, number>()
  for (const e of budgetEntries.filter(e => e.month <= currentMonth)) {
    budgetByClient.set(e.clientId, (budgetByClient.get(e.clientId) ?? 0) + e.plan)
  }

  const topClients: TvClient[] = clientActuals
    .filter(a => a.clientId != null && clientMap.has(a.clientId as string))
    .map(a => {
      const client = clientMap.get(a.clientId as string)!
      const realizadoYtd = a._sum.totNet ?? 0
      const planYtd = budgetByClient.get(a.clientId as string) ?? 0
      return {
        clientId: a.clientId as string,
        name: client.name,
        nameReduced: client.nameReduced || client.name,
        entity: client.entity ?? '',
        realizadoYtd,
        planYtd,
        atingimento: planYtd > 0 ? (realizadoYtd / planYtd) * 100 : 0,
      }
    })
    .sort((a, b) => b.realizadoYtd - a.realizadoYtd)
    .slice(0, 10)

  // KPIs YTD
  const ytdMonthly = monthly.filter(m => m.month <= currentMonth)
  const planYtd = ytdMonthly.reduce((s, m) => s + m.plan, 0)
  const realizadoYtd = ytdMonthly.reduce((s, m) => s + m.realizado, 0)

  const monthData = monthly[currentMonth - 1]

  const data: TvData = {
    year: YEAR,
    currentMonth,
    currentMonthName: MONTHS[currentMonth - 1],
    planYear: monthly.reduce((s, m) => s + m.plan, 0),
    fcYear: monthly.reduce((s, m) => s + m.fc, 0),
    realizadoYtd,
    planYtd,
    atingimentoYtd: planYtd > 0 ? (realizadoYtd / planYtd) * 100 : 0,
    marginYtd: 0,
    marginPct: 0,
    planMonth: monthData?.plan ?? 0,
    fcMonth: monthData?.fc ?? 0,
    realizadoMonth: monthData?.realizado ?? 0,
    atingimentoMonth: (monthData?.plan ?? 0) > 0
      ? ((monthData?.realizado ?? 0) / (monthData?.plan ?? 1)) * 100 : 0,
    monthly,
    entities,
    topClients,
    updatedAt: new Date().toISOString(),
  }

  return data
}
