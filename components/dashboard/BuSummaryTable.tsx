'use client'

import { formatMillions, formatPercent } from '@/lib/utils'
import type { BuRowData } from './DashboardShell'

const BU_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  'VCI':       { color: '#422c76', bg: 'rgba(66,44,118,0.1)',   label: 'VCI'     },
  'ARM - GRV': { color: '#ff2f69', bg: 'rgba(255,47,105,0.1)',  label: 'ARM GRV' },
  'ARM - ITV': { color: '#01E18E', bg: 'rgba(1,225,142,0.12)',  label: 'ARM ITV' },
  'ARM - NVG': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'ARM NVG' },
  'TRP':       { color: '#414042', bg: 'rgba(65,64,66,0.08)',   label: 'TRP'     },
}

export function BuSummaryTable({ data }: { data: BuRowData[] }) {
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

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-xs" style={{ color: '#9a8fb5' }}>
          Nenhuma BU selecionada
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((row) => {
            const cfg       = BU_CONFIG[row.entity] ?? { color: '#422c76', bg: 'rgba(66,44,118,0.1)', label: row.entity }
            const fc        = row.fc || row.plan
            const desvio    = row.faturado - row.plan
            const atingPct  = row.plan > 0 ? (row.faturado / row.plan) * 100 : 0
            const barColor  = atingPct >= 100 ? '#01E18E' : atingPct >= 80 ? '#f59e0b' : '#ff2f69'
            const pctColor  = barColor

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
                    {formatPercent(atingPct)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: '#6b6570' }}>
                  <span>Plano: <strong style={{ color: '#414042' }}>{formatMillions(row.plan)}</strong></span>
                  <span>Fat: <strong style={{ color: '#414042' }}>{formatMillions(row.faturado)}</strong></span>
                </div>

                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(66,44,118,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(atingPct, 100)}%`, background: barColor }}
                  />
                </div>

                <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: '#9a8fb5' }}>
                  <span>FC: {formatMillions(fc)}</span>
                  <span className="font-semibold" style={{ color: desvio >= 0 ? '#01E18E' : '#ff2f69' }}>
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
