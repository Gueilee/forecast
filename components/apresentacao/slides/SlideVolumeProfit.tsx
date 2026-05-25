'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts'
import { SlideBase, fmt, pct } from '../SlideBase'
import type { SlideProps } from '../types'

export function SlideVolumeProfit({ data, month }: SlideProps) {
  const monthlyChart = data.monthly.map(m => ({
    name: m.short,
    Orçado: Math.round(m.plan / 1e6 * 10) / 10,
    FC: Math.round(m.fc / 1e6 * 10) / 10,
    Realizado: m.month <= month ? Math.round(m.realizado / 1e6 * 10) / 10 : null,
  }))

  // YTD cumulative
  let cumPlan = 0, cumReal = 0, cumFc = 0
  const ytdChart = data.monthly.filter(m => m.month <= month).map(m => {
    cumPlan += m.plan
    cumReal += m.realizado
    cumFc += m.fc
    return {
      name: m.short,
      'Plano Acum.': Math.round(cumPlan / 1e6 * 10) / 10,
      'Realizado Acum.': Math.round(cumReal / 1e6 * 10) / 10,
      'FC Acum.': Math.round(cumFc / 1e6 * 10) / 10,
    }
  })

  const ytdMonthly = data.monthly.filter(m => m.month <= month)
  const planYtd = ytdMonthly.reduce((s, m) => s + m.plan, 0)
  const realizadoYtd = ytdMonthly.reduce((s, m) => s + m.realizado, 0)
  const marginYtd = ytdMonthly.reduce((s, m) => s + m.marginLiquid, 0)
  const mbPct = realizadoYtd > 0 ? (marginYtd / realizadoYtd) * 100 : 0
  const atingPct = pct(realizadoYtd, planYtd)

  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''

  return (
    <SlideBase
      title="Volume e Lucro Líquido"
      subtitle={`Mensal e Acumulado · ${data.year}`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* KPI row */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Faturado YTD', val: fmt(realizadoYtd), color: '#00E190' },
            { label: 'Plano YTD', val: fmt(planYtd), color: '#2E2657' },
            { label: 'Atingimento', val: `${atingPct.toFixed(1)}%`, color: atingPct >= 100 ? '#00E190' : atingPct >= 80 ? '#f59e0b' : '#F23A5A' },
            { label: `Margem Líq. YTD`, val: fmt(marginYtd), color: '#422c76' },
            { label: 'MB%', val: `${mbPct.toFixed(1)}%`, color: '#422c76' },
          ].map(k => (
            <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '7px', padding: '9px 11px', borderLeft: `3px solid ${k.color}` }}>
              <div style={{ color: '#9a8fb5', fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
              <div style={{ color: '#2E2657', fontSize: '16px', fontWeight: 800, marginTop: '3px' }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Two charts side by side */}
        <div style={{ flex: 1, display: 'flex', gap: '8px', minHeight: 0 }}>
          {/* Monthly bar chart */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '10px 8px' }}>
            <div style={{ color: '#2E2657', fontSize: '9.5px', fontWeight: 700, marginBottom: '2px', paddingLeft: '6px' }}>
              Mensal — Orçado / FC / Realizado
            </div>
            <ResponsiveContainer width="100%" height={268}>
              <ComposedChart data={monthlyChart} barCategoryGap="28%" barGap={1} margin={{ top: 8, right: 6, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,44,118,0.07)" />
                <XAxis dataKey="name" tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: '9px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v) => typeof v === 'number' ? [`R$ ${v}M`, ''] : ['—', '']}
                />
                <Legend iconSize={7} wrapperStyle={{ fontSize: '8px', paddingTop: '4px' }} />
                <Bar dataKey="Orçado" fill="rgba(46,38,87,0.18)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="FC" fill="rgba(242,58,90,0.25)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Realizado" fill="#00E190" radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* YTD cumulative */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '10px 8px' }}>
            <div style={{ color: '#2E2657', fontSize: '9.5px', fontWeight: 700, marginBottom: '2px', paddingLeft: '6px' }}>
              Acumulado YTD até {monthName}
            </div>
            <ResponsiveContainer width="100%" height={268}>
              <AreaChart data={ytdChart} margin={{ top: 8, right: 6, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E190" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00E190" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,44,118,0.07)" />
                <XAxis dataKey="name" tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: '9px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v) => typeof v === 'number' ? [`R$ ${v}M`, ''] : ['—', '']}
                />
                <Legend iconSize={7} wrapperStyle={{ fontSize: '8px', paddingTop: '4px' }} />
                <Area dataKey="Plano Acum." stroke="#2E2657" strokeWidth={1.5} fill="rgba(46,38,87,0.06)" strokeDasharray="4 2" dot={false} />
                <Area dataKey="FC Acum." stroke="#F23A5A" strokeWidth={1.5} fill="rgba(242,58,90,0.05)" strokeDasharray="4 2" dot={false} />
                <Area dataKey="Realizado Acum." stroke="#00E190" strokeWidth={2} fill="url(#gradReal)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </SlideBase>
  )
}
