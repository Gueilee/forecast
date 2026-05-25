'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { SlideBase, fmt, pct, desvioColor } from '../SlideBase'
import type { SlideProps } from '../types'

const ENTITY_COLORS: Record<string, string> = {
  VCI: '#422c76',
  'ARM-GRV': '#F23A5A',
  'ARM-ITV': '#00E190',
  'ARM-NVG': '#f59e0b',
  TRP: '#6b7280',
}

function KpiBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '12px 14px',
      borderLeft: `4px solid ${color}`,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ color: '#9a8fb5', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ color: '#2E2657', fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: '#9a8fb5', fontSize: '9px', marginTop: '3px' }}>{sub}</div>
      )}
    </div>
  )
}

export function SlideDashboard({ data, month }: SlideProps) {
  const ytdMonthly = data.monthly.filter(m => m.month <= month)
  const planYtd = ytdMonthly.reduce((s, m) => s + m.plan, 0)
  const fcYtd = ytdMonthly.reduce((s, m) => s + m.fc, 0)
  const realizadoYtd = ytdMonthly.reduce((s, m) => s + m.realizado, 0)
  const marginYtd = ytdMonthly.reduce((s, m) => s + m.marginLiquid, 0)

  const planYear = data.monthly.reduce((s, m) => s + m.plan, 0)
  const fcYear = data.monthly.reduce((s, m) => s + m.fc, 0)
  const atingPct = pct(realizadoYtd, planYtd)
  const mbPct = realizadoYtd > 0 ? (marginYtd / realizadoYtd) * 100 : 0

  const chartData = data.monthly.map(m => ({
    name: m.short,
    Orçado: Math.round(m.plan / 1e6 * 10) / 10,
    FC: Math.round(m.fc / 1e6 * 10) / 10,
    Realizado: m.month <= month ? Math.round(m.realizado / 1e6 * 10) / 10 : null,
  }))

  const atingColor = desvioColor(atingPct)

  return (
    <SlideBase
      title="Dashboard Executivo"
      subtitle={`YTD ${data.monthly.find(m => m.month === month)?.name ?? ''} ${data.year} · Consolidado`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
        {/* KPI Row 1 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <KpiBox
            label="Plano Anual"
            value={fmt(planYear)}
            sub={`FC: ${fmt(fcYear)}`}
            color="#2E2657"
          />
          <KpiBox
            label="Realizado YTD"
            value={fmt(realizadoYtd)}
            sub={`Plan YTD: ${fmt(planYtd)}`}
            color="#00E190"
          />
          <KpiBox
            label="Atingimento"
            value={`${atingPct.toFixed(1)}%`}
            sub={realizadoYtd > planYtd ? '▲ Acima do plano' : '▼ Abaixo do plano'}
            color={atingColor}
          />
          <KpiBox
            label="Margem Líquida"
            value={fmt(marginYtd)}
            sub={`MB%: ${mbPct.toFixed(1)}%`}
            color="#F23A5A"
          />
        </div>

        {/* Entity KPIs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {data.entities.map(e => {
            const ap = pct(e.realizadoYtd, e.planYtd)
            const color = ENTITY_COLORS[e.entity] ?? '#9a8fb5'
            return (
              <div key={e.entity} style={{
                flex: 1, background: '#fff', borderRadius: '8px', padding: '9px 12px',
                borderTop: `3px solid ${color}`,
              }}>
                <div style={{ color, fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>{e.entity}</div>
                <div style={{ color: '#2E2657', fontSize: '13px', fontWeight: 700, marginTop: '3px' }}>
                  {fmt(e.realizadoYtd)}
                </div>
                <div style={{ color: '#9a8fb5', fontSize: '9px' }}>{ap.toFixed(0)}% do plano</div>
                <div style={{ marginTop: '5px', height: '3px', background: '#f0eef8', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${Math.min(ap, 120)}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Chart */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '10px 12px', minHeight: 0 }}>
          <div style={{ color: '#2E2657', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
            Receita Mensal (R$ M) — {data.year}
          </div>
          <ResponsiveContainer width="100%" height={155}>
            <BarChart data={chartData} barCategoryGap="30%" barGap={1} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,44,118,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: '10px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(v) => typeof v === 'number' ? [`R$ ${v}M`, ''] : ['—', '']}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '9px', paddingTop: '2px' }} />
              <Bar dataKey="Orçado" fill="rgba(46,38,87,0.2)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="FC" fill="rgba(242,58,90,0.3)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Realizado" fill="#00E190" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SlideBase>
  )
}
