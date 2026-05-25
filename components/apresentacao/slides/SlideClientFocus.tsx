'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { SlideBase, fmt, pct } from '../SlideBase'
import type { SlideProps } from '../types'

interface Props extends SlideProps {
  entity: string
}

const ENTITY_COLORS: Record<string, string> = {
  VCI: '#422c76',
  'ARM-GRV': '#F23A5A',
  'ARM-ITV': '#00E190',
  'ARM-NVG': '#f59e0b',
  TRP: '#6b7280',
}

const ENTITY_LABELS: Record<string, string> = {
  VCI: 'Vendemmia Comércio Internacional',
  'ARM-GRV': 'Armazém Guarulhos',
  'ARM-ITV': 'Armazém Itajaí',
  'ARM-NVG': 'Armazém Navegantes',
  TRP: 'Transporte',
}

export function SlideClientFocus({ data, month, entity }: Props) {
  const color = ENTITY_COLORS[entity] ?? '#2E2657'
  const fullName = ENTITY_LABELS[entity] ?? entity
  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''

  const entityMonthly = data.entityMonthly.filter(em => em.entity === entity)
  const chartData = entityMonthly.map(em => ({
    name: data.monthly.find(m => m.month === em.month)?.short ?? String(em.month),
    Orçado: Math.round(em.plan / 1e6 * 10) / 10,
    FC: Math.round(em.fc / 1e6 * 10) / 10,
    Realizado: em.month <= month ? Math.round(em.realizado / 1e6 * 10) / 10 : null,
  }))

  const clients = data.topClients
    .filter(c => c.entity === entity)
    .sort((a, b) => b.planYtd - a.planYtd)
    .slice(0, 8)

  const ytdData = entityMonthly.filter(em => em.month <= month)
  const planYtd = ytdData.reduce((s, em) => s + em.plan, 0)
  const fcYtd = ytdData.reduce((s, em) => s + em.fc, 0)
  const realYtd = ytdData.reduce((s, em) => s + em.realizado, 0)
  const atingPct = pct(realYtd, planYtd)

  return (
    <SlideBase
      title={`Foco no Cliente — ${entity}`}
      subtitle={`${fullName} · YTD até ${monthName} ${data.year}`}
      contentBg="#f2f1f8"
      right={
        <div style={{
          background: `${color}22`, borderRadius: '6px', padding: '3px 10px',
          color, fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em',
        }}>
          {entity}
        </div>
      }
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', gap: '10px' }}>
        {/* Left: KPIs + chart */}
        <div style={{ flex: '0 0 52%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'Plano YTD', val: fmt(planYtd), c: '#2E2657' },
              { label: 'FC YTD', val: fmt(fcYtd), c: '#F23A5A' },
              { label: 'Realizado YTD', val: fmt(realYtd), c: color },
              { label: 'Atingimento', val: `${atingPct.toFixed(1)}%`, c: atingPct >= 100 ? '#00E190' : atingPct >= 80 ? '#f59e0b' : '#F23A5A' },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '7px', padding: '7px 9px', borderLeft: `3px solid ${k.c}` }}>
                <div style={{ color: '#9a8fb5', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                <div style={{ color: '#2E2657', fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '8px 6px' }}>
            <div style={{ color: '#2E2657', fontSize: '9px', fontWeight: 700, paddingLeft: '6px', marginBottom: '2px' }}>
              Receita Mensal (R$ M) — {entity}
            </div>
            <ResponsiveContainer width="100%" height={270}>
              <ComposedChart data={chartData} barCategoryGap="28%" barGap={1} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,44,118,0.07)" />
                <XAxis dataKey="name" tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: '9px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v) => typeof v === 'number' ? [`R$ ${v}M`, ''] : ['—', '']}
                />
                <Legend iconSize={7} wrapperStyle={{ fontSize: '8px', paddingTop: '2px' }} />
                <Bar dataKey="Orçado" fill="rgba(46,38,87,0.15)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="FC" fill={`${color}30`} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Realizado" fill={color} radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Top clients table */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            background: color, padding: '8px 12px',
            color: '#fff', fontSize: '9.5px', fontWeight: 700,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Principais Clientes</span>
            <span style={{ opacity: 0.7, fontSize: '8.5px' }}>YTD até {monthName}</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(46,38,87,0.06)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#2E2657', fontWeight: 700 }}>Cliente</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Plano</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Real.</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Ating.</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => {
                  const ap = pct(c.realizadoYtd, c.planYtd)
                  const barColor = ap >= 100 ? '#00E190' : ap >= 80 ? '#f59e0b' : '#F23A5A'
                  return (
                    <tr key={c.clientId} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fd' }}>
                      <td style={{ padding: '6px 10px', maxWidth: '130px' }}>
                        <div style={{ color: '#414042', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '9px' }}>
                          {c.nameReduced || c.name}
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9a8fb5' }}>
                        {fmt(c.planYtd)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>
                        {fmt(c.realizadoYtd)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <div style={{ width: '32px', height: '4px', background: '#f0eef8', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(ap, 120)}%`, background: barColor, borderRadius: '2px' }} />
                          </div>
                          <span style={{ color: barColor, fontWeight: 700, minWidth: '32px', textAlign: 'right', fontSize: '9px' }}>
                            {ap.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#9a8fb5', fontSize: '9px' }}>
                      Nenhum cliente com dados para este período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SlideBase>
  )
}
