'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { TvData } from '../types'
import { fmtM } from '../TvDashboard'

function useCountUp(target: number) {
  const [v, setV] = useState(0)
  useEffect(() => {
    setV(0)
    let start: number | null = null
    function tick(ts: number) {
      if (!start) start = ts
      const p = Math.min((ts - start) / 2200, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setV(target * e)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return v
}

export function TvSlideForecast({ data }: { data: TvData }) {
  const currentMonth = data.currentMonth

  const chartData = data.monthly.map(m => {
    const isActual = m.month < currentMonth && m.realizado > 0
    const isCurrent = m.month === currentMonth
    return {
      name: m.short,
      Plano: Math.round(m.plan / 1e6 * 10) / 10,
      FC: Math.round(m.fc / 1e6 * 10) / 10,
      Realizado: isActual ? Math.round(m.realizado / 1e6 * 10) / 10 : null,
      Projeção: !isActual ? Math.round(m.fc / 1e6 * 10) / 10 : null,
      isCurrent,
    }
  })

  const fcYear = data.fcYear
  const realizadoYtd = data.realizadoYtd
  const fcRemaining = fcYear - realizadoYtd
  const gapToFc = fcYear - data.planYear
  const gapPct = data.planYear > 0 ? (gapToFc / data.planYear) * 100 : 0

  const animFc = useCountUp(fcYear)
  const animReal = useCountUp(realizadoYtd)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '28px 48px', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Projeção de Encerramento
          </div>
          <div style={{
            fontSize: '36px', fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #ffffff 30%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Forecast Anual {data.year}
          </div>
        </div>

        {/* FC vs Plan gap */}
        <div style={{
          background: gapToFc >= 0 ? 'rgba(1,225,142,0.1)' : 'rgba(255,47,105,0.1)',
          border: `1px solid ${gapToFc >= 0 ? 'rgba(1,225,142,0.3)' : 'rgba(255,47,105,0.3)'}`,
          borderRadius: '12px', padding: '10px 18px', textAlign: 'center',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            FC vs Plano
          </div>
          <div style={{
            fontSize: '22px', fontWeight: 900,
            color: gapToFc >= 0 ? '#01E18E' : '#ff2f69',
            filter: `drop-shadow(0 0 10px ${gapToFc >= 0 ? '#01E18E' : '#ff2f69'}60)`,
          }}>
            {gapToFc >= 0 ? '+' : ''}{gapPct.toFixed(1)}%
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', marginTop: '2px' }}>{fmtM(Math.abs(gapToFc))}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
        {/* Chart */}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px',
          padding: '20px 12px 12px',
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="gradPlan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradFc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff2f69" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ff2f69" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#01E18E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#01E18E" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v}M`}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(6,4,18,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px' }}
                labelStyle={{ color: '#fff', fontWeight: 700 }}
                formatter={(v) => typeof v === 'number' ? [`R$ ${v}M`, ''] : ['—', '']}
              />
              <ReferenceLine
                x={data.monthly[currentMonth - 1]?.short}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 3"
                label={{ value: 'Hoje', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              />
              <Area dataKey="Plano" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#gradPlan)" dot={false} connectNulls />
              <Area dataKey="FC" stroke="#ff2f69" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gradFc)" dot={false} connectNulls />
              <Area dataKey="Realizado" stroke="#01E18E" strokeWidth={2.5} fill="url(#gradReal)" dot={false} connectNulls />
              <Area dataKey="Projeção" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" fill="url(#gradProj)" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right panel */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* FC Anual */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,47,105,0.2)', borderRadius: '16px',
            padding: '20px', position: 'relative', overflow: 'hidden',
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#ff2f69', boxShadow: '0 0 12px #ff2f69' }} />
            <div style={{ position: 'absolute', top: '-20px', right: '-10px', width: '80px', height: '80px', borderRadius: '50%', background: '#ff2f69', filter: 'blur(40px)', opacity: 0.15 }} />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              FC Projetado Ano
            </div>
            <div style={{
              fontSize: '32px', fontWeight: 900, lineHeight: 1,
              background: 'linear-gradient(135deg, #fff 0%, #ff2f69 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px',
            }}>
              {fmtM(animFc)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '6px' }}>Encerramento {data.year}</div>
          </div>

          {/* Realizado YTD */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(1,225,142,0.2)', borderRadius: '16px',
            padding: '20px', position: 'relative', overflow: 'hidden',
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#01E18E', boxShadow: '0 0 12px #01E18E' }} />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Faturado YTD
            </div>
            <div style={{
              fontSize: '28px', fontWeight: 900, lineHeight: 1,
              color: '#01E18E',
              filter: 'drop-shadow(0 0 12px #01E18E60)',
              letterSpacing: '-1px',
            }}>
              {fmtM(animReal)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '6px' }}>Jan–{data.currentMonthName}</div>
          </div>

          {/* Restante FC */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px',
            padding: '16px 20px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
              FC Restante
            </div>
            <div style={{ color: '#f59e0b', fontSize: '22px', fontWeight: 900 }}>{fmtM(fcRemaining)}</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', marginTop: '4px' }}>
              {data.currentMonthName} → Dez
            </div>

            {/* FC progress */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((realizadoYtd / fcYear) * 100, 100)}%`,
                  background: 'linear-gradient(to right, #ff2f69, #01E18E)',
                  borderRadius: '2px',
                  transition: 'width 2s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: '#01E18E', fontSize: '9px' }}>{fcYear > 0 ? ((realizadoYtd / fcYear) * 100).toFixed(0) : 0}% realizado</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
