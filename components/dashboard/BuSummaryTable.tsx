import { db } from '@/lib/db'
import { formatMillions, formatPercent } from '@/lib/utils'

const YEAR = 2026

// BU accent colors using brand palette
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
      const [budget, actual] = await Promise.all([
        db.budgetEntry.aggregate({
          where: { year: YEAR, client: { entity } },
          _sum: { plan: true, fcMonth: true },
        }),
        db.actualWeekly.aggregate({
          where: { year: YEAR, client: { entity } },
          _sum: { totFaturado: true, marginLiquid: true },
        }),
      ])

      const plan = budget._sum.plan ?? 0
      const fc = budget._sum.fcMonth ?? plan
      const faturado = actual._sum.totFaturado ?? 0
      const margin = actual._sum.marginLiquid ?? 0
      const desvio = faturado - plan
      const mbPct = faturado > 0 ? (margin / faturado) * 100 : 0
      const atingPct = plan > 0 ? (faturado / plan) * 100 : 0

      return { entity, plan, fc, faturado, desvio, mbPct, atingPct }
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
          const cfg = BU_CONFIG[row.entity] ?? { color: '#422c76', bg: 'rgba(66,44,118,0.1)', label: row.entity }
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
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: pctColor }}
                >
                  {formatPercent(row.atingPct)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: '#6b6570' }}>
                <span>Plano: <strong style={{ color: '#414042' }}>{formatMillions(row.plan)}</strong></span>
                <span>Fat: <strong style={{ color: '#414042' }}>{formatMillions(row.faturado)}</strong></span>
              </div>

              {/* Progress bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(66,44,118,0.1)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(row.atingPct, 100)}%`,
                    background: barColor,
                  }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: '#9a8fb5' }}>
                <span>MB: {formatPercent(row.mbPct)}</span>
                <span
                  className="font-semibold"
                  style={{ color: row.desvio >= 0 ? '#01E18E' : '#ff2f69' }}
                >
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
