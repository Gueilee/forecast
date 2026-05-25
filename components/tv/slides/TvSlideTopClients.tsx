'use client'

import { useEffect, useState } from 'react'
import type { TvData } from '../types'
import { fmtM, ENTITY_COLORS } from '../TvDashboard'

function AnimatedBar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(pct, 110)), delay)
    return () => clearTimeout(t)
  }, [pct, delay])

  return (
    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.min(width, 100)}%`,
        background: `linear-gradient(to right, ${color}60, ${color})`,
        borderRadius: '3px',
        boxShadow: `0 0 8px ${color}80`,
        transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
      }} />
    </div>
  )
}

export function TvSlideTopClients({ data }: { data: TvData }) {
  const clients = data.topClients.slice(0, 10)
  const maxReal = Math.max(...clients.map(c => c.realizadoYtd), 1)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '28px 48px', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Ranking de Clientes
          </div>
          <div style={{
            fontSize: '36px', fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #ffffff 30%, #60a5fa 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Top Clientes — YTD {data.currentMonthName}
          </div>
        </div>
        <div style={{
          background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
          borderRadius: '10px', padding: '8px 16px',
          color: '#60a5fa', fontSize: '11px', fontWeight: 700,
        }}>
          {clients.length} clientes · Faturado acumulado
        </div>
      </div>

      {/* Client list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {clients.map((client, i) => {
          const color = ENTITY_COLORS[client.entity] ?? '#8b5cf6'
          const apColor = client.atingimento >= 100 ? '#01E18E' : client.atingimento >= 80 ? '#f59e0b' : '#ff2f69'
          const barPct = (client.realizadoYtd / maxReal) * 100

          return (
            <div key={client.clientId} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
              padding: '10px 16px',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Left accent */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: color, boxShadow: `0 0 8px ${color}` }} />

              {/* Rank */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                background: i < 3 ? `${color}20` : 'rgba(255,255,255,0.04)',
                border: i < 3 ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i < 3 ? color : 'rgba(255,255,255,0.3)',
                fontSize: '14px', fontWeight: 900,
              }}>
                {i + 1}
              </div>

              {/* Entity badge */}
              <div style={{
                flexShrink: 0, padding: '2px 8px', borderRadius: '6px',
                background: `${color}20`, border: `1px solid ${color}40`,
                color, fontSize: '9px', fontWeight: 800, letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {client.entity}
              </div>

              {/* Name */}
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{
                  color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 700,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {client.nameReduced}
                </div>
              </div>

              {/* Bar */}
              <AnimatedBar pct={barPct} color={color} delay={200 + i * 80} />

              {/* Realizado */}
              <div style={{ width: '80px', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#01E18E', fontSize: '14px', fontWeight: 800 }}>{fmtM(client.realizadoYtd)}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>Faturado</div>
              </div>

              {/* Plano */}
              <div style={{ width: '70px', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>{fmtM(client.planYtd)}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>Plano</div>
              </div>

              {/* Atingimento */}
              <div style={{
                width: '52px', textAlign: 'right', flexShrink: 0,
                color: apColor, fontSize: '13px', fontWeight: 900,
                filter: `drop-shadow(0 0 6px ${apColor}60)`,
              }}>
                {client.planYtd > 0 ? `${client.atingimento.toFixed(0)}%` : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
