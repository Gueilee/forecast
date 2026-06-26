import { db } from '@/lib/db'
import { Header } from '@/components/layout/Header'
import { ForecastMatrix, ClientData, WeekSnapshotEntry } from '@/components/forecast/ForecastMatrix'
import { getLastClosedWindow } from '@/lib/forecast-window'
import { randomUUID } from 'crypto'

const YEAR = 2026
const createId = () => randomUUID().replace(/-/g, '').substring(0, 25)

async function getMatrixData(): Promise<ClientData[]> {
  const [clients, budgetEntries, weeklyActuals, comments, refExternals] = await Promise.all([
    db.client.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameReduced: true,
        nameChart: true,
        entity: true,
        commercialType: true,
        pl4Bu: true,
        modality: true,
        accountManager: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    }),
    db.budgetEntry.findMany({
      where: { year: YEAR, client: { isActive: true } },
      select: {
        clientId: true,
        month: true,
        plan: true,
        fcMonth: true,
        orders: true,
        withoutOrders: true,
        lastWeek: true,
        faturado: true,
        mbPlanPct: true,
        mbFcPct: true,
      },
    }),
    db.actualWeekly.findMany({
      where: { year: YEAR },
      select: { clientId: true, month: true, totFaturado: true },
    }),
    db.weekComment.findMany({
      where: { year: YEAR, weekOfMonth: null },
      select: { clientId: true, month: true, comment: true },
      orderBy: { updatedAt: 'desc' },
    }),
    db.actualNF.findMany({
      where: {
        year: YEAR,
        refCliente: { not: null },
        clientId:   { not: null },
        NOT: { scope: { startsWith: 'ENT' } },
      },
      select: { clientId: true, month: true, refCliente: true },
    }),
  ])

  const fatMap = new Map<string, number>()
  for (const w of weeklyActuals) {
    const k = `${w.clientId}:${w.month}`
    fatMap.set(k, (fatMap.get(k) ?? 0) + w.totFaturado)
  }

  const budgetMap = new Map<string, typeof budgetEntries[0]>()
  for (const b of budgetEntries) {
    budgetMap.set(`${b.clientId}:${b.month}`, b)
  }

  const commentMap = new Map<string, string>()
  for (const c of comments) {
    const k = `${c.clientId}:${c.month}`
    if (!commentMap.has(k)) commentMap.set(k, c.comment)
  }

  const refExtSets = new Map<string, Set<string>>()
  for (const r of refExternals) {
    const k = `${r.clientId}:${r.month}`
    if (!refExtSets.has(k)) refExtSets.set(k, new Set())
    refExtSets.get(k)!.add(r.refCliente!)
  }
  const refExtMap = new Map<string, number>()
  refExtSets.forEach((set, k) => refExtMap.set(k, set.size))

  return clients.map(c => {
    const months: ClientData['months'] = {}

    for (let m = 1; m <= 12; m++) {
      const b    = budgetMap.get(`${c.id}:${m}`)
      const faturado = b?.faturado ?? 0

      months[m] = {
        plan:          b?.plan ?? 0,
        fc:            b?.fcMonth ?? null,
        orders:        b?.orders ?? null,
        withoutOrders: b?.withoutOrders ?? null,
        faturado,
        lastWeek:      b?.lastWeek ?? null,
        mbPlan:        b?.mbPlanPct ?? null,
        mbFc:          b?.mbFcPct  ?? null,
        refExternal:   refExtMap.get(`${c.id}:${m}`) ?? 0,
        weekComment:   commentMap.get(`${c.id}:${m}`) ?? null,
      }
    }

    return {
      id:             c.id,
      nameReduced:    c.nameReduced,
      nameChart:      c.nameChart,
      entity:         c.entity,
      commercialType: c.commercialType,
      pl4Bu:          c.pl4Bu,
      modality:       c.modality,
      accountManager: c.accountManager,
      sortOrder:      c.sortOrder,
      months,
    }
  })
}

async function getWeeklySnapshots(year: number): Promise<WeekSnapshotEntry[]> {
  return db.weeklyForecastSnapshot.findMany({
    where: { year },
    select: { clientId: true, month: true, isoYear: true, isoWeek: true, fcValue: true },
    orderBy: [{ isoYear: 'desc' }, { isoWeek: 'desc' }],
  })
}

/**
 * Cria o snapshot da semana mais recentemente fechada, se ainda não existir.
 * Captura o fcMonth de todos os clientes/meses no momento do lock.
 */
async function maybeCreateSnapshot(year: number) {
  const lastClosed = getLastClosedWindow()

  const existing = await db.weeklyForecastSnapshot.findFirst({
    where: { year, isoYear: lastClosed.isoYear, isoWeek: lastClosed.isoWeek },
    select: { id: true },
  })
  if (existing) return

  const budgets = await db.budgetEntry.findMany({
    where: { year, client: { isActive: true } },
    select: { clientId: true, month: true, fcMonth: true },
  })

  if (budgets.length === 0) return

  // Insere em lotes de 100 para não sobrecarregar o driver libSQL
  const rows = budgets.map(b => ({
    id:       createId(),
    clientId: b.clientId,
    year,
    month:    b.month,
    isoYear:  lastClosed.isoYear,
    isoWeek:  lastClosed.isoWeek,
    fcValue:  b.fcMonth ?? null,
  }))
  for (let i = 0; i < rows.length; i += 100) {
    await db.weeklyForecastSnapshot.createMany({ data: rows.slice(i, i + 100) })
  }
}

export default async function ForecastPage() {
  // Cria snapshot da semana fechada se ainda não existir (lazy, no page load)
  await maybeCreateSnapshot(YEAR)

  const [clients, weeklySnapshots] = await Promise.all([
    getMatrixData(),
    getWeeklySnapshots(YEAR),
  ])

  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Forecast Matrix"
        subtitle={`Plano Orçamentário ${YEAR} · ${clients.length} clientes`}
      />
      <ForecastMatrix
        clients={clients}
        year={YEAR}
        currentMonth={currentMonth}
        weeklySnapshots={weeklySnapshots}
      />
    </div>
  )
}
