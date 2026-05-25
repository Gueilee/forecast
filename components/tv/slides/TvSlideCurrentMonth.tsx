'use client'

import { useEffect, useState } from 'react'
import type { TvData } from '../types'
import { fmtM, ENTITY_COLORS } from '../TvDashboard'

function BigGauge({ pct }: { pct: number }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 300)
    return () => clearTimeout(t)
  }, [pct])

  const size = 260
  const r = 100
  const circ = Math.PI * r // half circle
  const strokeWidth = 14
  const offset = circ * (1 - Math.min(animated, 100) / 100)
  const color = animated >= 100 ? '#01E18E' : animated >= 80 ? '#f59e0b' : '#ff2f69'

  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 40 }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Track */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 12px ${color})`,
            transition: 'stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
        {/* Glow gradient overlay */}
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '64px', fontWeight: 900, letterSpacing: '-2px',
          color, filter: `drop-shadow(0 0 24px ${color})`,
          lineHeight: 1,
        }}>
          {animated.toFixed(1)}%
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
          Atingimento do mês
        </div>
      </div>
    </div>
  )
}

function DaysRemaining({ month, year }: { month: number; year: number }) {
  const today = new Date()
  const lastDay = new Date(year, month, 0).getDate()
  const remaining = lastDay - today.getDate()
  const pct = ((today.getDate()) / lastDay) * 100
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px',
      padding: '14px 20px', textAlign: 'center',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Dias úteis restantes</div>
      <div style={{ color: '#60a5fa', fontSize: '32px', fontWeight: 900 }}>{remaining}</div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#60a5fa', borderRadius: '2px', boxShadow: '0 0 8px #60a5fa80' }} />
      </div>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', marginTop: '4px' }}>{pct.toFixed(0)}% do mês decorrido</div>
    </div>
  )
}

export function TvSlideCurrentMonth({ data }: { data: TvData }) {
  const atingPct = data.atingimentoMonth

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '28px 48px', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Período em curso
          </div>
          <div style={{
            fontSize: '36px', fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #ffffff 30%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {data.currentMonthName} {data.year}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '20px' }}>
        {/* Left: Gauge + days */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', width: '320px' }}>
          <BigGauge pct={atingPct} />
          <DaysRemaining month={data.currentMonth} year={data.year} />
        </div>

        {/* Center/Right: Metrics + entity */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Month KPIs */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: 'Plano do Mês', value: fmtM(data.planMonth), color: '#8b5cf6' },
              { label: 'FC do Mês', value: fmtM(data.fcMonth), color: '#ff2f69' },
              { label: 'Faturado', value: fmtM(data.realizadoMonth), color: '#01E18E' },
            ].map(k => (
              <div key={k.label} style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
                border: `1px solid ${k.color}25`, borderRadius: '16px',
                padding: '20px', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: k.color, boxShadow: `0 0 10px ${k.color}` }} />
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ color: k.color, fontSize: '28px', fontWeight: 900, filter: `drop-shadow(0 0 10px ${k.color}60)` }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Entity breakdown for current month */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px',
            padding: '16px 20px',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
              Por Unidade — {data.currentMonthName}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.entities.map(e => {
                const color = ENTITY_COLORS[e.entity] ?? '#8b5cf6'
                const ap = e.planMonth > 0 ? (e.realizadoMonth / e.planMonth) * 100 : 0
                const apColor = ap >= 100 ? '#01E18E' : ap >= 80 ? '#f59e0b' : '#ff2f69'
                return (
                  <div key={e.entity} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '64px', color, fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>{e.entity}</div>
                    <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: e.planMonth > 0 ? `${Math.min(ap, 110)}%` : '0',
                        background: `linear-gradient(to right, ${color}80, ${color})`,
                        borderRadius: '4px',
                        boxShadow: `0 0 8px ${color}60`,
                        transition: 'width 1.5s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                    </div>
                    <div style={{ width: '70px', textAlign: 'right', color: '#fff', fontSize: '13px', fontWeight: 700 }}>{fmtM(e.planMonth)}</div>
                    <div style={{ width: '70px', textAlign: 'right', color: '#01E18E', fontSize: '13px', fontWeight: 700 }}>{fmtM(e.realizadoMonth)}</div>
                    <div style={{ width: '44px', textAlign: 'right', color: apColor, fontSize: '12px', fontWeight: 800 }}>
                      {e.planMonth > 0 ? `${ap.toFixed(0)}%` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
