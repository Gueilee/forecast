import { db } from '@/lib/db'
import { formatMillions, formatPercent } from '@/lib/utils'

const YEAR = 2026
const CURRENT_MONTH = new Date().getMonth() + 1

const BU_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  'VCI':       { color: '#422c76', bg: 'rgba(66,44,118,0.1)',  label: 'VCI' },
  'ARM - GRV': { color: '#ff2f69', bg: 'rgba(255,47,105,0.1)', label: 'ARM GRV' },
  'ARM - ITV': { color: '#01E18E', bg: 'rgba(1,225,142,0.12)', label: 'ARM ITV' },
  'ARM - NVG': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',label: 'ARM NVG' },
  'TRP':       { color: '#414042', bg: 'rgba(65,64,66,0.08)',  label: 'TRP' },
}

async function getBuData() {
  const entities = Object.keys(BU_CONFIG)

  const results = await Promise.all(
    entities.map(async (entity) => {
      const [budget, weeklyActual, budgetFaturado] = await Promise.all([
        db.budgetEntry.aggregate({
          where: { year: YEAR, month: { lte: CURRENT_MONTH }, client: { entity } },
          _sum: { plan: true, fcMonth: true },
        }),
        // Faturado real: ActualWeekly (mesma fonte do Forecast Matrix)
        db.actualWeekly.aggregate({
          where: { year: YEAR, month: { lte: CURRENT_MONTH }, client: { entity } },
          _sum: { totFaturado: true },
        }),
        // Fallback: faturado do Excel (BudgetEntry.faturado) — usado quando Conexos ainda não sincronizou
        db.budgetEntry.aggregate({
          where: { year: YEAR, month: { lte: CURRENT_MONTH }, client: { entity } },
          _sum: { faturado: true },
        }),
      ])

      const plan      = budget._sum.plan ?? 0
      const fc        = budget._sum.fcMonth ?? plan
      const cnxsFat   = weeklyActual._sum.totFaturado ?? 0
      const excelFat  = budgetFaturado._sum.faturado ?? 0
      const faturado  = cnxsFat > 0 ? cnxsFat : excelFat
      const desvio    = faturado - plan
      const atingPct  = plan > 0 ? (faturado / plan) * 100 : 0

      return { entity, plan, fc, faturado, desvio, mbPct: 0, atingPct }
    })
  )

  return results
}

export async function BuSummaryTable() {
  const data = await getBuData()

  return (
    <div
      className="rounded-2xl p-5 h-full"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(66,44,118,0.08)',
        boxShadow: '0 2px 12px rgba(66,44,118,0.06)',
      }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold" style={{ color: '#414042' }}>
          Resumo por BU
        </h3>
        <p className="text-xs mt-0.5 font-medium" style={{ color: '#9a8fb5' }}>
          Plano vs Realizado YTD
        </p>
      </div>

      <div className="space-y-3">
        {data.map((row) => {
          const cfg      = BU_CONFIG[row.entity] ?? { color: '#422c76', bg: 'rgba(66,44,118,0.1)', label: row.entity }
          const barColor = row.atingPct >= 100 ? '#01E18E' : row.atingPct >= 80 ? '#f59e0b' : '#ff2f69'
          const pctColor = row.atingPct >= 100 ? '#01E18E' : row.atingPct >= 80 ? '#f59e0b' : '#ff2f69'

          return (
            <div
              key={row.entity}
              className="p-3 rounded-xl transition-all hover:-translate-y-0.5 cursor-default"
              style={{
                background: '#faf9f5',
                border: `1px solid ${cfg.color}20`,
                borderLeft: `3px solid ${cfg.color}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: pctColor }}>
                  {formatPercent(row.atingPct)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: '#6b6570' }}>
                <span>Plano: <strong style={{ color: '#414042' }}>{formatMillions(row.plan)}</strong></span>
                <span>Fat: <strong style={{ color: '#414042' }}>{formatMillions(row.faturado)}</strong></span>
              </div>

              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(66,44,118,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(row.atingPct, 100)}%`, background: barColor }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: '#9a8fb5' }}>
                <span>FC: {formatMillions(row.fc)}</span>
                <span className="font-semibold" style={{ color: row.desvio >= 0 ? '#01E18E' : '#ff2f69' }}>
                  {row.desvio >= 0 ? '+' : ''}{formatMillions(row.desvio)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
