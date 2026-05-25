import { db } from '@/lib/db'
import { Header } from '@/components/layout/Header'
import { ForecastMatrix, MatrixRow } from '@/components/forecast/ForecastMatrix'

const YEAR = 2026

async function getMatrixData(): Promise<MatrixRow[]> {
  const [clients, budgetEntries, weeklyActuals] = await Promise.all([
    db.client.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameReduced: true,
        accountManager: true,
        entity: true,
        modality: true,
        commercialType: true,
        pl4Bu: true,
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
      },
    }),
    db.actualWeekly.findMany({
      where: { year: YEAR },
      select: {
        clientId: true,
        month: true,
        weekOfMonth: true,
        totFaturado: true,
      },
    }),
  ])

  const budgetMap = new Map<string, (typeof budgetEntries)[0]>()
  for (const b of budgetEntries) {
    budgetMap.set(`${b.clientId}:${b.month}`, b)
  }

  const weekMap = new Map<string, number>()
  for (const w of weeklyActuals) {
    const key = `${w.clientId}:${w.month}:${w.weekOfMonth}`
    weekMap.set(key, (weekMap.get(key) ?? 0) + w.totFaturado)
  }

  return clients.map((c) => {
    const months: MatrixRow['months'] = {}
    for (let m = 1; m <= 12; m++) {
      const b = budgetMap.get(`${c.id}:${m}`)
      const weeks: Record<number, number> = {}
      for (let w = 1; w <= 5; w++) {
        weeks[w] = weekMap.get(`${c.id}:${m}:${w}`) ?? 0
      }
      const faturado = Object.values(weeks).reduce((a, v) => a + v, 0)
      months[m] = {
        plan: b?.plan ?? 0,
        fc: b?.fcMonth ?? null,
        faturado,
        orders: b?.orders ?? null,
        withoutOrders: b?.withoutOrders ?? null,
        weeks,
      }
    }
    return {
      id: c.id,
      sortOrder: c.sortOrder,
      nameReduced: c.nameReduced,
      accountManager: c.accountManager,
      entity: c.entity,
      modality: c.modality,
      commercialType: c.commercialType,
      pl4Bu: c.pl4Bu,
      months,
    }
  })
}

export default async function ForecastPage() {
  const rows = await getMatrixData()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Forecast Matrix"
        subtitle={`Plano Orçamentário ${YEAR} · ${rows.length} linhas de serviço`}
      />
      <ForecastMatrix rows={rows} year={YEAR} currentMonth={currentMonth} />
    </div>
  )
}
