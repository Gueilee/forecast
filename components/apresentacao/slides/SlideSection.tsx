'use client'

import type { SlideProps } from '../types'

interface Props extends SlideProps {
  title: string
  subtitle?: string
}

export function SlideSection({ title, subtitle, data }: Props) {
  void data
  return (
    <div style={{ width: '960px', height: '540px', background: '#2E2657', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {/* Right columns - full pink/red + green */}
      <div style={{ position: 'absolute', right: '96px', top: 0, bottom: 0, width: '210px', background: '#F23A5A' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '96px', background: '#00E190' }} />

      {/* Logo v2 na coluna vermelha */}
      <div style={{ position: 'absolute', right: '96px', top: '44px', width: '210px', display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_v2.png" alt="Forecast by Vendemmia" style={{ width: '170px', height: 'auto' }} />
      </div>

      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Section number decoration */}
      <div style={{
        position: 'absolute', left: '64px', top: '92px',
        color: 'rgba(255,255,255,0.06)', fontSize: '140px', fontWeight: 900, lineHeight: 1,
        userSelect: 'none', letterSpacing: '-6px',
      }}>
        §
      </div>

      {/* Section title */}
      <div style={{ position: 'absolute', left: '64px', top: '140px', right: '330px' }}>
        <div style={{ color: '#F23A5A', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Seção
        </div>
        <div style={{ color: '#ffffff', fontSize: '48px', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', fontWeight: 300, marginTop: '12px' }}>
            {subtitle}
          </div>
        )}
        <div style={{ height: '5px', width: '200px', background: '#00E190', marginTop: '24px', borderRadius: '3px' }} />
      </div>

      {/* Bottom brand */}
      <div style={{
        position: 'absolute', left: '64px', bottom: '32px',
        color: '#00E190', fontSize: '12px', fontWeight: 700,
        letterSpacing: '0.22em', textTransform: 'uppercase',
      }}>
        Vendemmia Logística Integrada
      </div>
    </div>
  )
}
