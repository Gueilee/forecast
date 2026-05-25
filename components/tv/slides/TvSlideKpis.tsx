'use client'

import { useEffect, useState, useRef } from 'react'
import type { TvData } from '../types'
import { fmtM } from '../TvDashboard'

function useCountUp(target: number) {
  const [v, setV] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    setV(0)
    startRef.current = null
    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts
      const p = Math.min((ts - startRef.current) / 2000, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setV(target * e)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return v
}

function GlassCard({ label, value, sub, color, large }: {
  label: string; value: string; sub?: string; color: string; large?: boolean
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(24px)',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: '20px',
      padding: large ? '32px 36px' : '24px 28px',
      position: 'relative',
      overflow: 'hidden',
      flex: 1,
    }}>
      {/* Top color bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, boxShadow: `0 0 16px ${color}` }} />
      {/* Glow bg */}
      <div style={{ position: 'absolute', top: '-40px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: color, filter: 'blur(50px)', opacity: 0.15 }} />

      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '12px' }}>
        {label}
      </div>
      <div style={{
        fontSize: large ? '52px' : '40px',
        fontWeight: 900,
        lineHeight: 1,
        background: `linear-gradient(135deg, #ffffff 0%, ${color} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-1px',
        marginBottom: sub ? '8px' : '0',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '6px' }}>{sub}</div>
      )}
    </div>
  )
}

function AnnualProgress({ realizado, plan, year }: { realizado: number; plan: number; year: number }) {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(year, 0, 1).getTime()) / 86400000)
  const totalDays = year % 4 === 0 ? 366 : 365
  const yearProgress = (dayOfYear / totalDays) * 100
  const revenueProgress = plan > 0 ? Math.min((realizado / plan) * 100, 100) : 0

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px 32px',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '20px' }}>
        Progresso do Ano {year}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {[
          { label: 'Calendário', pct: yearProgress, color: '#60a5fa', fmt: `${yearProgress.toFixed(0)}% do ano` },
          { label: 'Receita Realizada', pct: revenueProgress, color: '#01E18E', fmt: `${revenueProgress.toFixed(1)}% do plano` },
        ].map(row => (
          <div key={row.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{row.label}</span>
              <span style={{ color: row.color, fontSize: '11px', fontWeight: 700 }}>{row.fmt}</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${row.pct}%`, borderRadius: '3px',
                background: row.color,
                boxShadow: `0 0 10px ${row.color}80`,
                transition: 'width 2s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TvSlideKpis({ data }: { data: TvData }) {
  const animPlan = useCountUp(data.planYear)
  const animFc = useCountUp(data.fcYear)
  const animReal = useCountUp(data.realizadoYtd)
  const animAting = useCountUp(data.atingimentoYtd)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '32px 48px', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Vendemmia Logística Integrada
          </div>
          <div style={{
            fontSize: '36px', fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #ffffff 30%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Visão Geral — {data.year}
          </div>
        </div>
        <div style={{
          background: 'rgba(1,225,142,0.12)', border: '1px solid rgba(1,225,142,0.3)',
          borderRadius: '12px', padding: '8px 18px',
          color: '#01E18E', fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#01E18E', display: 'inline-block', boxShadow: '0 0 8px #01E18E' }} />
          LIVE · YTD {data.currentMonthName}
        </div>
      </div>

      {/* Main KPIs */}
      <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
        <GlassCard large label="Plano Anual" value={fmtM(animPlan)} color="#8b5cf6" sub={`Meta ${data.year}`} />
        <GlassCard large label="FC Revisado" value={fmtM(animFc)} color="#ff2f69" sub="Projeção atualizada" />
        <GlassCard large label={`Faturado YTD`} value={fmtM(animReal)} color="#01E18E" sub={`Jan–${data.currentMonthName}`} />
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
          padding: '32px 36px', position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: animAting >= 100 ? '#01E18E' : animAting >= 80 ? '#f59e0b' : '#ff2f69', boxShadow: `0 0 16px ${animAting >= 100 ? '#01E18E' : '#ff2f69'}` }} />
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '10px' }}>
            Atingimento YTD
          </div>
          <div style={{
            fontSize: '72px', fontWeight: 900, lineHeight: 1,
            color: animAting >= 100 ? '#01E18E' : animAting >= 80 ? '#f59e0b' : '#ff2f69',
            filter: `drop-shadow(0 0 20px ${animAting >= 100 ? '#01E18E' : '#ff2f69'})`,
            letterSpacing: '-2px',
          }}>
            {animAting.toFixed(1)}%
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '8px' }}>
            do Plano Anual YTD
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <GlassCard label="Margem Líquida YTD" value={fmtM(data.marginYtd)} color="#f59e0b" sub={`MB% ${data.marginPct.toFixed(1)}%`} />
        <GlassCard label="Plano YTD" value={fmtM(data.planYtd)} color="#8b5cf6" sub={`Jan–${data.currentMonthName}`} />
        <div style={{ flex: 2 }}>
          <AnnualProgress realizado={data.realizadoYtd} plan={data.planYear} year={data.year} />
        </div>
      </div>
    </div>
  )
}
