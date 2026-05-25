import { db } from '@/lib/db'
import { MONTHS, MONTH_SHORT } from '@/lib/utils'
import { PresentationViewer } from '@/components/apresentacao/PresentationViewer'
import { ENTITY_ORDER } from '@/lib/tv-data'
import type {
  PresentationData,
  MonthlyPoint,
  EntitySummary,
  EntityMonthlyPoint,
  TopClient,
} from '@/components/apresentacao/types'

const YEAR = 2026

async function getPresentationData(): Promise<PresentationData> {
  const currentMonth = new Date().getMonth() + 1

  const [
    budgetEntries,
    monthlyActual,
    entityMonthlyActual,
    clientActuals,
    clients,
  ] = await Promise.all([
    db.budgetEntry.findMany({
      where: { year: YEAR },
      select: {
        clientId: true, month: true, plan: true, fcMonth: true,
        client: { select: { entity: true } },
      },
    }),
    // Faturado por mês (todas as NFs)
    db.actualNF.groupBy({
      by: ['month'],
      where: { year: YEAR },
      _sum: { totNet: true },
      orderBy: { month: 'asc' },
    }),
    // Faturado por BU+mês
    db.actualNF.groupBy({
      by: ['buName', 'month'],
      where: { year: YEAR, buName: { not: null } },
      _sum: { totNet: true },
    }),
    // Faturado por cliente linkado (YTD)
    db.actualNF.groupBy({
      by: ['clientId'],
      where: { year: YEAR, month: { lte: currentMonth }, clientId: { not: null } },
      _sum: { totNet: true },
    }),
    db.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameReduced: true, entity: true },
    }),
  ])

  // Monthly totals (12 meses)
  const monthly: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const entries = budgetEntries.filter(e => e.month === m)
    const actual = monthlyActual.find(a => a.month === m)
    return {
      month: m,
      name: MONTHS[i],
      short: MONTH_SHORT[i],
      plan: entries.reduce((s, e) => s + e.plan, 0),
      fc: entries.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0),
      realizado: actual?._sum.totNet ?? 0,
      marginLiquid: 0,
    }
  })

  // Entidades disponíveis
  const entitySet = new Set(clients.map(c => c.entity).filter((e): e is string => !!e))
  const entityList = ENTITY_ORDER.filter(e => entitySet.has(e))

  // Entity × Month breakdown
  const entityMonthly: EntityMonthlyPoint[] = []
  for (const entity of entityList) {
    for (let m = 1; m <= 12; m++) {
      const entries = budgetEntries.filter(e => e.month === m && e.client.entity === entity)
      const realizado = entityMonthlyActual
        .filter(a => a.buName === entity && a.month === m)
        .reduce((s, a) => s + (a._sum.totNet ?? 0), 0)

      entityMonthly.push({
        entity,
        month: m,
        plan: entries.reduce((s, e) => s + e.plan, 0),
        fc: entries.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0),
        realizado,
      })
    }
  }

  // Entity summaries
  const entities: EntitySummary[] = entityList.map(entity => {
    const yearEntries = budgetEntries.filter(e => e.client.entity === entity)
    const ytdEntries  = yearEntries.filter(e => e.month <= currentMonth)
    const entityClients = clients.filter(c => c.entity === entity)

    const planYear = yearEntries.reduce((s, e) => s + e.plan, 0)
    const fcYear   = yearEntries.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0)
    const planYtd  = ytdEntries.reduce((s, e) => s + e.plan, 0)

    const realizadoYtd = entityMonthlyActual
      .filter(a => a.buName === entity && (a.month ?? 0) <= currentMonth)
      .reduce((s, a) => s + (a._sum.totNet ?? 0), 0)

    return {
      entity,
      planYear,
      fcYear,
      planYtd,
      realizadoYtd,
      atingimento: planYtd > 0 ? (realizadoYtd / planYtd) * 100 : 0,
      clientCount: entityClients.length,
    }
  })

  // Top clientes por entidade (faturado YTD dos linkados)
  const clientActualMap = new Map(
    clientActuals.map(a => [a.clientId as string, a._sum.totNet ?? 0])
  )
  const budgetByClient = new Map<string, number>()
  for (const e of budgetEntries.filter(e => e.month <= currentMonth)) {
    budgetByClient.set(e.clientId, (budgetByClient.get(e.clientId) ?? 0) + e.plan)
  }

  const topClients: TopClient[] = []
  for (const entity of entityList) {
    const entityClientList = clients.filter(c => c.entity === entity)
    const clientData = entityClientList.map(client => {
      const planYtd      = budgetByClient.get(client.id) ?? 0
      const realizadoYtd = clientActualMap.get(client.id) ?? 0
      return {
        entity,
        clientId: client.id,
        name: client.name,
        nameReduced: client.nameReduced || client.name,
        planYtd,
        realizadoYtd,
        atingimento: planYtd > 0 ? (realizadoYtd / planYtd) * 100 : 0,
      }
    })
    clientData.sort((a, b) => b.planYtd - a.planYtd)
    topClients.push(...clientData.slice(0, 8))
  }

  return { year: YEAR, monthly, entities, entityMonthly, topClients }
}

export default async function ApresentacaoPage() {
  const data = await getPresentationData()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <PresentationViewer data={data} initialMonth={currentMonth} />
    </div>
  )
}
