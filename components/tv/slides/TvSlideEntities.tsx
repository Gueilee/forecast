'use client'

import { useEffect, useState } from 'react'
import type { TvData } from '../types'
import { fmtM, ENTITY_COLORS } from '../TvDashboard'

function CircleProgress({ pct, color, size = 110 }: { pct: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(Math.min(pct, 150)), 200)
    return () => clearTimeout(timer)
  }, [pct])

  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(animated, 100) / 100)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          filter: `drop-shadow(0 0 8px ${color})`,
          transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      <text
        x={size / 2} y={size / 2 + 6}
        textAnchor="middle"
        fill={animated >= 100 ? color : 'rgba(255,255,255,0.8)'}
        fontSize={animated > 99 ? '18' : '20'}
        fontWeight="900"
        style={{ filter: animated >= 100 ? `drop-shadow(0 0 6px ${color})` : 'none' }}
      >
        {animated.toFixed(0)}%
      </text>
    </svg>
  )
}

export function TvSlideEntities({ data }: { data: TvData }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '32px 48px', gap: '20px' }}>
      {/* Header */}
      <div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Atingimento por Área
        </div>
        <div style={{
          fontSize: '36px', fontWeight: 900, letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #ffffff 30%, #01E18E 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Unidades de Negócio — YTD {data.currentMonthName}
        </div>
      </div>

      {/* Entity cards */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', alignItems: 'stretch' }}>
        {data.entities.map(entity => {
          const color = ENTITY_COLORS[entity.entity] ?? '#8b5cf6'
          const ap = entity.atingimento
          const apColor = ap >= 100 ? '#01E18E' : ap >= 80 ? '#f59e0b' : '#ff2f69'

          return (
            <div key={entity.entity} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
              border: `1px solid ${color}25`,
              borderRadius: '20px', padding: '24px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              position: 'relative', overflow: 'hidden',
              boxShadow: `0 0 30px ${color}15`,
            }}>
              {/* Top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, boxShadow: `0 0 12px ${color}` }} />
              {/* Bg glow */}
              <div style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '200px', borderRadius: '50%', background: color, filter: 'blur(60px)', opacity: 0.1, pointerEvents: 'none' }} />

              {/* Entity name */}
              <div style={{
                color, fontSize: '13px', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: '16px',
                textShadow: `0 0 12px ${color}80`,
              }}>
                {entity.entity}
              </div>

              {/* Circle progress */}
              <CircleProgress pct={ap} color={apColor} size={120} />

              {/* Values */}
              <div style={{ marginTop: '16px', textAlign: 'center', width: '100%' }}>
                <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>
                  {fmtM(entity.realizadoYtd)}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginBottom: '12px' }}>
                  Faturado YTD
                </div>

                {/* Mini bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {[
                    { label: 'Plano', v: entity.planYtd, total: entity.planYtd, c: '#8b5cf680' },
                    { label: 'FC', v: entity.fcYtd, total: entity.planYtd, c: '#ff2f6980' },
                    { label: 'Real.', v: entity.realizadoYtd, total: entity.planYtd, c: color },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>{row.label}</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '9px' }}>{fmtM(row.v)}</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: row.total > 0 ? `${Math.min((row.v / row.total) * 100, 100)}%` : '0%',
                          background: row.c,
                          borderRadius: '2px',
                          transition: 'width 1.5s cubic-bezier(0.16,1,0.3,1)',
                          boxShadow: row.label === 'Real.' ? `0 0 6px ${row.c}` : 'none',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
