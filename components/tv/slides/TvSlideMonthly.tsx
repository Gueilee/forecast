'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import type { TvData } from '../types'
import { fmtM } from '../TvDashboard'

export function TvSlideMonthly({ data }: { data: TvData }) {
  const chartData = data.monthly.map(m => ({
    name: m.short,
    Orçado: Math.round(m.plan / 1e6 * 10) / 10,
    FC: Math.round(m.fc / 1e6 * 10) / 10,
    Realizado: m.month <= data.currentMonth && m.realizado > 0
      ? Math.round(m.realizado / 1e6 * 10) / 10 : null,
    isCurrent: m.month === data.currentMonth,
  }))

  const planYear = data.monthly.reduce((s, m) => s + m.plan, 0)
  const fcYear = data.monthly.reduce((s, m) => s + m.fc, 0)
  const realYtd = data.monthly.filter(m => m.month <= data.currentMonth).reduce((s, m) => s + m.realizado, 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '32px 48px', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Análise Temporal
          </div>
          <div style={{
            fontSize: '36px', fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #ffffff 30%, #ff2f69 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Performance Mensal {data.year}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { label: 'Plano Anual', value: fmtM(planYear), color: '#8b5cf6' },
            { label: 'FC Anual', value: fmtM(fcYear), color: '#ff2f69' },
            { label: 'Faturado YTD', value: fmtM(realYtd), color: '#01E18E' },
          ].map(k => (
            <div key={k.label} style={{
              background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
              border: `1px solid ${k.color}30`, borderRadius: '12px',
              padding: '12px 20px', textAlign: 'center',
              boxShadow: `0 0 20px ${k.color}15`,
            }}>
              <div style={{ color: k.color, fontSize: '20px', fontWeight: 800 }}>{k.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '2px' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px',
        padding: '24px 16px 16px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow behind current month */}
        <div style={{
          position: 'absolute',
          left: `${((data.currentMonth - 1) / 12) * 100 + 2}%`,
          top: 0, bottom: 0, width: '8%',
          background: 'radial-gradient(ellipse, rgba(255,47,105,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} barCategoryGap="25%" barGap={2} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v}M`}
            />
            <Tooltip
              contentStyle={{ background: 'rgba(6,4,18,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '13px' }}
              labelStyle={{ color: '#fff', fontWeight: 700 }}
              formatter={(v) => typeof v === 'number' ? [`R$ ${v}M`, ''] : ['—', '']}
            />
            <Legend
              wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', paddingTop: '8px' }}
              iconSize={10}
            />
            <Bar dataKey="Orçado" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)'} />
              ))}
            </Bar>
            <Bar dataKey="FC" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? 'rgba(255,47,105,0.6)' : 'rgba(255,47,105,0.25)'} />
              ))}
            </Bar>
            <Bar dataKey="Realizado" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? '#01E18E' : 'rgba(1,225,142,0.7)'} />
              ))}
            </Bar>
            <Line
              dataKey="FC" stroke="#ff2f69" strokeWidth={2} dot={false}
              strokeDasharray="5 3" opacity={0.6}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
