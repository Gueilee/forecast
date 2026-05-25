'use client'

import { SlideBase, fmt, pct } from '../SlideBase'
import type { SlideProps } from '../types'

interface Props extends SlideProps {
  variant: 'monthly' | 'ytd'
}

const ENTITY_COLORS: Record<string, string> = {
  VCI: '#422c76',
  'ARM-GRV': '#F23A5A',
  'ARM-ITV': '#00E190',
  'ARM-NVG': '#f59e0b',
  TRP: '#6b7280',
}

function DesvioCell({ real, plan }: { real: number; plan: number }) {
  const d = plan > 0 ? ((real - plan) / plan) * 100 : 0
  const color = d >= 0 ? '#00C07A' : d >= -20 ? '#f59e0b' : '#F23A5A'
  return (
    <td style={{ padding: '5px 8px', textAlign: 'right', color, fontWeight: 700, fontSize: '10px' }}>
      {d >= 0 ? '+' : ''}{d.toFixed(1)}%
    </td>
  )
}

export function SlideDRE({ data, month, variant }: Props) {
  const isYtd = variant === 'ytd'
  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''

  // Filter months based on variant
  const months = isYtd
    ? data.monthly.filter(m => m.month <= month)
    : data.monthly.filter(m => m.month === month)

  const totalPlan = months.reduce((s, m) => s + m.plan, 0)
  const totalFc = months.reduce((s, m) => s + m.fc, 0)
  const totalReal = months.reduce((s, m) => s + m.realizado, 0)
  const totalMargin = months.reduce((s, m) => s + m.marginLiquid, 0)

  const mbPlanPct = totalPlan > 0 ? (totalMargin / totalPlan) * 100 : 0
  const mbRealPct = totalReal > 0 ? (totalMargin / totalReal) * 100 : 0

  // Entity-level breakdown
  const entityRows = data.entities.map(e => {
    const emMonths = isYtd
      ? data.entityMonthly.filter(em => em.entity === e.entity && em.month <= month)
      : data.entityMonthly.filter(em => em.entity === e.entity && em.month === month)

    const ePlan = emMonths.reduce((s, em) => s + em.plan, 0)
    const eFc = emMonths.reduce((s, em) => s + em.fc, 0)
    const eReal = emMonths.reduce((s, em) => s + em.realizado, 0)

    return { entity: e.entity, plan: ePlan, fc: eFc, real: eReal }
  })

  const label = isYtd ? `YTD Jan–${monthName}` : monthName

  return (
    <SlideBase
      title={`DRE Executivo — ${isYtd ? 'Acumulado YTD' : 'Mensal'}`}
      subtitle={`${label} ${data.year} · Receita por Unidade de Negócio`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '12px 16px', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Summary row */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Plano', val: fmt(totalPlan), color: '#2E2657' },
            { label: 'FC', val: fmt(totalFc), color: '#F23A5A' },
            { label: 'Realizado', val: fmt(totalReal), color: '#00E190' },
            { label: 'Margem Líq.', val: fmt(totalMargin), color: '#422c76' },
            { label: 'MB%', val: `${mbRealPct.toFixed(1)}%`, color: '#422c76' },
            { label: 'Atingimento', val: `${pct(totalReal, totalPlan).toFixed(1)}%`, color: pct(totalReal, totalPlan) >= 100 ? '#00E190' : '#F23A5A' },
          ].map(k => (
            <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '7px', padding: '8px 10px', borderLeft: `3px solid ${k.color}` }}>
              <div style={{ color: '#9a8fb5', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
              <div style={{ color: '#2E2657', fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* DRE Table */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <thead>
              <tr style={{ background: '#2E2657' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', fontWeight: 700, width: '28%' }}>
                  Unidade de Negócio
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Plano</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>FC</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Realizado</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Desvio</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Ating.%</th>
              </tr>
            </thead>
            <tbody>
              {entityRows.map((row, i) => {
                const color = ENTITY_COLORS[row.entity] ?? '#9a8fb5'
                const ap = pct(row.real, row.plan)
                return (
                  <tr key={row.entity} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fd' }}>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                        background: `${color}18`, color, fontWeight: 700, fontSize: '10px',
                      }}>
                        {row.entity}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#414042', fontWeight: 500 }}>
                      {fmt(row.plan)}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#414042', fontWeight: 500 }}>
                      {fmt(row.fc)}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>
                      {fmt(row.real)}
                    </td>
                    <DesvioCell real={row.real} plan={row.plan} />
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 7px', borderRadius: '4px',
                        background: ap >= 100 ? '#00E19018' : ap >= 80 ? '#f59e0b18' : '#F23A5A18',
                        color: ap >= 100 ? '#00A066' : ap >= 80 ? '#c07c00' : '#c01040',
                        fontWeight: 700, fontSize: '10px',
                      }}>
                        {ap.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}

              {/* Total row */}
              <tr style={{ background: '#2E2657', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 800 }}>TOTAL</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>{fmt(totalPlan)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>{fmt(totalFc)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#00E190', fontWeight: 800 }}>{fmt(totalReal)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                  <span style={{ color: pct(totalReal, totalPlan) >= 100 ? '#00E190' : '#F23A5A', fontWeight: 700 }}>
                    {pct(totalReal, totalPlan) >= 100 ? '+' : ''}{((totalReal - totalPlan) / Math.max(totalPlan, 1) * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#00E190', fontWeight: 800 }}>
                  {pct(totalReal, totalPlan).toFixed(1)}%
                </td>
              </tr>

              {/* Margem row */}
              <tr style={{ background: '#1e1840' }}>
                <td style={{ padding: '6px 12px', color: 'rgba(255,255,255,0.6)', fontSize: '9.5px', fontStyle: 'italic' }}>
                  Margem Líquida
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontSize: '9.5px' }}>
                  {fmt(totalMargin)}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontSize: '9.5px' }}>—</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#00E190', fontSize: '9.5px', fontWeight: 700 }}>
                  {fmt(totalMargin)}
                </td>
                <td colSpan={2} style={{ padding: '6px 10px', textAlign: 'right', color: '#00E190', fontSize: '9.5px', fontWeight: 700 }}>
                  MB {mbRealPct.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideBase>
  )
}
