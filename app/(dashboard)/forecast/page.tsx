import { db } from '@/lib/db'
import { Header } from '@/components/layout/Header'
import { ForecastMatrix, ClientData } from '@/components/forecast/ForecastMatrix'

const YEAR = 2026

async function getMatrixData(): Promise<ClientData[]> {
  const [clients, budgetEntries, weeklyActuals, comments] = await Promise.all([
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
      where: { year: YEAR },
      select: {
        clientId: true,
        month: true,
        plan: true,
        fcMonth: true,
        orders: true,
        withoutOrders: true,
        lastWeek: true,
        faturado: true,   // histórico do Excel (fallback quando Conexos ainda não sincronizou)
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
  ])

  // Faturado real do Conexos (soma de ActualWeekly por cliente/mês)
  const fatMap = new Map<string, number>()
  for (const w of weeklyActuals) {
    const k = `${w.clientId}:${w.month}`
    fatMap.set(k, (fatMap.get(k) ?? 0) + w.totFaturado)
  }

  // Budget entries por clientId:month
  const budgetMap = new Map<string, typeof budgetEntries[0]>()
  for (const b of budgetEntries) {
    budgetMap.set(`${b.clientId}:${b.month}`, b)
  }

  // Comentários por clientId:month (mais recente por ordering)
  const commentMap = new Map<string, string>()
  for (const c of comments) {
    const k = `${c.clientId}:${c.month}`
    if (!commentMap.has(k)) commentMap.set(k, c.comment)
  }

  return clients.map(c => {
    const months: ClientData['months'] = {}

    for (let m = 1; m <= 12; m++) {
      const b    = budgetMap.get(`${c.id}:${m}`)
      const cnxs = fatMap.get(`${c.id}:${m}`) ?? 0

      // Faturado: prioridade Conexos (ActualWeekly), fallback Excel (BudgetEntry.faturado)
      const faturado = cnxs > 0 ? cnxs : (b?.faturado ?? 0)

      months[m] = {
        plan:          b?.plan ?? 0,
        fc:            b?.fcMonth ?? null,
        orders:        b?.orders ?? null,
        withoutOrders: b?.withoutOrders ?? null,
        faturado,
        lastWeek:      b?.lastWeek ?? null,
        mbPlan:        b?.mbPlanPct ?? null,
        mbFc:          b?.mbFcPct  ?? null,
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

export default async function ForecastPage() {
  const clients      = await getMatrixData()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Forecast Matrix"
        subtitle={`Plano Orçamentário ${YEAR} · ${clients.length} clientes`}
      />
      <ForecastMatrix clients={clients} year={YEAR} currentMonth={currentMonth} />
    </div>
  )
}
