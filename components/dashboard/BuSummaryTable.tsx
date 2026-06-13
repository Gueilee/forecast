'use client'

import { formatMillions, formatPercent } from '@/lib/utils'
import type { BuRowData } from './DashboardShell'

const BU_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  'VCI':       { color: '#422c76', bg: 'rgba(66,44,118,0.08)',  label: 'VCI'     },
  'ARM - GRV': { color: '#ff2f69', bg: 'rgba(255,47,105,0.08)', label: 'ARM GRV' },
  'ARM - ITV': { color: '#01E18E', bg: 'rgba(1,225,142,0.1)',   label: 'ARM ITV' },
  'ARM - NVG': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'ARM NVG' },
  'TRP':       { color: '#6b6570', bg: 'rgba(107,101,112,0.08)',label: 'TRP'     },
}

export function BuSummaryTable({ data }: { data: BuRowData[] }) {
  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(66,44,118,0.07)',
        boxShadow: '0 2px 8px rgba(66,44,118,0.05)',
      }}
    >
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-sm font-bold" style={{ color: '#414042' }}>Resumo por BU</h3>
        <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#9a8fb5' }}>
          Plano vs Realizado YTD
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs" style={{ color: '#b8b0ca' }}>
          Nenhuma BU selecionada
        </div>
      ) : (
        <div className="flex flex-col flex-1 gap-2 min-h-0">
          {data.map((row) => {
            const cfg      = BU_CONFIG[row.entity] ?? { color: '#422c76', bg: 'rgba(66,44,118,0.08)', label: row.entity }
            const fc       = row.fc || row.plan
            const desvio   = row.faturado - row.plan
            const atingPct = row.plan > 0 ? (row.faturado / row.plan) * 100 : 0
            const barColor = atingPct >= 100 ? '#01E18E' : atingPct >= 80 ? '#f59e0b' : '#ff2f69'

            return (
              <div
                key={row.entity}
                className="flex-1 min-h-0 p-3 rounded-xl flex flex-col justify-between cursor-default transition-all duration-150 hover:-translate-y-px"
                style={{
                  background: '#faf9f5',
                  border: `1px solid ${cfg.color}18`,
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span
                    className="text-sm font-black tabular-nums"
                    style={{ color: barColor }}
                  >
                    {formatPercent(atingPct)}
                  </span>
                </div>

                {/* Values */}
                <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: '#6b6570' }}>
                  <span>Plano: <strong style={{ color: '#414042' }}>{formatMillions(row.plan)}</strong></span>
                  <span>Fat: <strong style={{ color: '#414042' }}>{formatMillions(row.faturado)}</strong></span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(66,44,118,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(atingPct, 100)}%`, background: barColor }}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px]" style={{ color: '#9a8fb5' }}>
                  <span>FC: {formatMillions(fc)}</span>
                  <span className="font-bold" style={{ color: desvio >= 0 ? '#01E18E' : '#ff2f69' }}>
                    {desvio >= 0 ? '+' : ''}{formatMillions(desvio)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
