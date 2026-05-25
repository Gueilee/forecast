import { db } from '@/lib/db'
import { MONTHS, MONTH_SHORT } from '@/lib/utils'
import { PresentationViewer } from '@/components/apresentacao/PresentationViewer'
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

  const [budgetEntries, actuals, clients] = await Promise.all([
    db.budgetEntry.findMany({
      where: { year: YEAR },
      select: {
        clientId: true,
        month: true,
        plan: true,
        fcMonth: true,
        client: { select: { entity: true } },
      },
    }),
    db.actualWeekly.findMany({
      where: { year: YEAR },
      select: {
        clientId: true,
        month: true,
        totFaturado: true,
        marginLiquid: true,
        client: { select: { entity: true } },
      },
    }),
    db.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameReduced: true, entity: true },
    }),
  ])

  // Monthly totals (12 months)
  const monthly: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const entries = budgetEntries.filter(e => e.month === m)
    const acts = actuals.filter(a => a.month === m)
    return {
      month: m,
      name: MONTHS[i],
      short: MONTH_SHORT[i],
      plan: entries.reduce((s, e) => s + e.plan, 0),
      fc: entries.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0),
      realizado: acts.reduce((s, a) => s + a.totFaturado, 0),
      marginLiquid: acts.reduce((s, a) => s + (a.marginLiquid ?? 0), 0),
    }
  })

  // Unique entities
  const entitySet = new Set(
    clients.map(c => c.entity).filter((e): e is string => e !== null && e !== undefined && e !== '')
  )
  const entityList = ['VCI', 'ARM-GRV', 'ARM-ITV', 'ARM-NVG', 'TRP'].filter(e => entitySet.has(e))
    .concat([...entitySet].filter(e => !['VCI', 'ARM-GRV', 'ARM-ITV', 'ARM-NVG', 'TRP'].includes(e)))

  // Entity monthly
  const entityMonthly: EntityMonthlyPoint[] = []
  for (const entity of entityList) {
    for (let m = 1; m <= 12; m++) {
      const entries = budgetEntries.filter(e => e.month === m && e.client.entity === entity)
      const acts = actuals.filter(a => a.month === m && a.client.entity === entity)
      entityMonthly.push({
        entity,
        month: m,
        plan: entries.reduce((s, e) => s + e.plan, 0),
        fc: entries.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0),
        realizado: acts.reduce((s, a) => s + a.totFaturado, 0),
      })
    }
  }

  // Entity summaries
  const entities: EntitySummary[] = entityList.map(entity => {
    const yearEntries = budgetEntries.filter(e => e.client.entity === entity)
    const ytdEntries = yearEntries.filter(e => e.month <= currentMonth)
    const ytdActs = actuals.filter(a => a.client.entity === entity && a.month <= currentMonth)
    const entityClients = clients.filter(c => c.entity === entity)

    const planYear = yearEntries.reduce((s, e) => s + e.plan, 0)
    const fcYear = yearEntries.reduce((s, e) => s + (e.fcMonth ?? e.plan), 0)
    const planYtd = ytdEntries.reduce((s, e) => s + e.plan, 0)
    const realizadoYtd = ytdActs.reduce((s, a) => s + a.totFaturado, 0)

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

  // Top clients per entity (YTD)
  const topClients: TopClient[] = []
  for (const entity of entityList) {
    const entityClientList = clients.filter(c => c.entity === entity)
    const clientData = entityClientList.map(client => {
      const entries = budgetEntries.filter(e => e.clientId === client.id && e.month <= currentMonth)
      const acts = actuals.filter(a => a.clientId === client.id && a.month <= currentMonth)
      const planYtd = entries.reduce((s, e) => s + e.plan, 0)
      const realizadoYtd = acts.reduce((s, a) => s + a.totFaturado, 0)
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
