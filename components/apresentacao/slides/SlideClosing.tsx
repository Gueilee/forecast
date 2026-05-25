'use client'

import { MONTHS } from '@/lib/utils'
import type { SlideProps } from '../types'

function quarter(month: number) {
  return `Q${Math.ceil(month / 3)}`
}

export function SlideClosing({ data, month }: SlideProps) {
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

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Closing message */}
      <div style={{ position: 'absolute', left: '64px', top: '130px', right: '330px' }}>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>
          Obrigado
        </div>
        <div style={{ color: '#ffffff', fontSize: '52px', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-1.5px' }}>
          Dúvidas &
        </div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '48px', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-1px' }}>
          Discussões
        </div>

        <div style={{ height: '6px', width: '300px', background: '#F23A5A', marginTop: '22px', marginBottom: '18px', borderRadius: '3px' }} />

        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', fontWeight: 400 }}>
          {MONTHS[month - 1]} · {quarter(month)} · {data.year}
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ color: '#00E190', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em' }}>
            www.vendemmia.com.br
          </div>
        </div>
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
