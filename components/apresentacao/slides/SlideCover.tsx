'use client'

import { MONTHS } from '@/lib/utils'
import type { SlideProps } from '../types'

interface Props extends SlideProps {
  onMonthChange: (m: number) => void
}

function quarter(month: number) {
  return `Q${Math.ceil(month / 3)}`
}

export function SlideCover({ data, month, onMonthChange }: Props) {
  return (
    <div style={{ width: '960px', height: '540px', background: '#2E2657', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {/* Full pink/red right column */}
      <div style={{ position: 'absolute', right: '96px', top: 0, bottom: 0, width: '210px', background: '#F23A5A' }} />
      {/* Green strip far right */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '96px', background: '#00E190' }} />

      {/* Logo v2 na coluna vermelha */}
      <div style={{ position: 'absolute', right: '96px', top: '44px', width: '210px', display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_v2.png" alt="Forecast by Vendemmia" style={{ width: '170px', height: 'auto' }} />
      </div>

      {/* Subtle grid pattern on navy bg */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Main title */}
      <div style={{ position: 'absolute', left: '64px', top: '124px' }}>
        <div style={{ color: '#ffffff', fontSize: '58px', fontWeight: 900, lineHeight: 0.92, letterSpacing: '-2px' }}>
          Reunião
        </div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '54px', fontWeight: 300, lineHeight: 1.0, letterSpacing: '-1px', marginTop: '4px' }}>
          mensal
        </div>

        {/* Pink separator */}
        <div style={{ height: '6px', width: '360px', background: '#F23A5A', marginTop: '22px', marginBottom: '18px', borderRadius: '3px' }} />

        {/* Month/quarter subtitle */}
        <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: '21px', fontWeight: 400, letterSpacing: '0.03em' }}>
          {MONTHS[month - 1]} · {quarter(month)} · {data.year}
        </div>
      </div>

      {/* Bottom brand text */}
      <div style={{
        position: 'absolute', left: '64px', bottom: '32px',
        color: '#00E190', fontSize: '12px', fontWeight: 700,
        letterSpacing: '0.22em', textTransform: 'uppercase',
      }}>
        Vendemmia Logística Integrada
      </div>

      {/* Month selector - in pink column */}
      <div style={{ position: 'absolute', right: '106px', bottom: '40px', width: '180px', padding: '0 8px' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>
          Mês de referência
        </div>
        <select
          value={month}
          onChange={e => onMonthChange(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: '7px',
            border: '1.5px solid rgba(255,255,255,0.5)',
            background: 'rgba(0,0,0,0.15)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1} style={{ background: '#2E2657', color: '#fff' }}>
              {m} {data.year}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
