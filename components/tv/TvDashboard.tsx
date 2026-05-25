'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Maximize2, Minimize2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { TvData } from './types'
import { TvSlideKpis } from './slides/TvSlideKpis'
import { TvSlideMonthly } from './slides/TvSlideMonthly'
import { TvSlideEntities } from './slides/TvSlideEntities'
import { TvSlideCurrentMonth } from './slides/TvSlideCurrentMonth'
import { TvSlideTopClients } from './slides/TvSlideTopClients'
import { TvSlideForecast } from './slides/TvSlideForecast'

const SLIDES = [
  { id: 0, label: 'Visão Geral', duration: 14000 },
  { id: 1, label: 'Performance Mensal', duration: 16000 },
  { id: 2, label: 'Por Unidade de Negócio', duration: 14000 },
  { id: 3, label: 'Mês Atual', duration: 13000 },
  { id: 4, label: 'Top Clientes', duration: 16000 },
  { id: 5, label: 'Projeção Anual', duration: 13000 },
]

const ENTITY_COLORS: Record<string, string> = {
  VCI: '#8b5cf6',
  'ARM-GRV': '#ff2f69',
  'ARM-ITV': '#01E18E',
  'ARM-NVG': '#f59e0b',
  TRP: '#60a5fa',
}

export { ENTITY_COLORS }

function fmtM(v: number): string {
  if (v === 0) return '—'
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`
  return `R$ ${v.toFixed(0)}`
}

export { fmtM }

function Clock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  useEffect(() => {
    function update() {
      const now = new Date()
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ color: '#fff', fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>{time}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '1px', textTransform: 'capitalize' }}>{date}</div>
    </div>
  )
}

interface Props { initialData: TvData }

export function TvDashboard({ initialData }: Props) {
  const [data, setData] = useState<TvData>(initialData)
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const goNext = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setCurrent(c => (c + 1) % SLIDES.length)
      setProgress(0)
      setVisible(true)
    }, 600)
  }, [])

  // Auto-advance slides
  useEffect(() => {
    const duration = SLIDES[current].duration
    const step = 100 / (duration / 100)

    if (progressRef.current) clearInterval(progressRef.current)
    if (slideRef.current) clearTimeout(slideRef.current)

    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + step, 100))
    }, 100)

    slideRef.current = setTimeout(goNext, duration)

    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
      if (slideRef.current) clearTimeout(slideRef.current)
    }
  }, [current, goNext])

  // Refresh data every 60s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/tv', { cache: 'no-store' })
        if (res.ok) setData(await res.json())
      } catch { /* silently ignore */ }
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  function renderSlide() {
    switch (current) {
      case 0: return <TvSlideKpis data={data} />
      case 1: return <TvSlideMonthly data={data} />
      case 2: return <TvSlideEntities data={data} />
      case 3: return <TvSlideCurrentMonth data={data} />
      case 4: return <TvSlideTopClients data={data} />
      case 5: return <TvSlideForecast data={data} />
      default: return null
    }
  }

  return (
    <>
      <style>{`
        /* Large anchor orbs */
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          30% { transform: translate(80px,-100px) scale(1.08); }
          70% { transform: translate(-60px,70px) scale(0.92); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(-90px,80px) scale(0.95); }
          80% { transform: translate(70px,-50px) scale(1.1); }
        }
        @keyframes orb3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(60px,60px) scale(1.05); }
        }
        @keyframes orb4 {
          0%,100% { transform: translate(0,0) scale(1); }
          35% { transform: translate(-70px,-80px) scale(1.1); }
          75% { transform: translate(50px,90px) scale(0.9); }
        }
        @keyframes orb5 {
          0%,100% { transform: translate(0,0) scale(1); }
          45% { transform: translate(90px,-40px) scale(1.06); }
          90% { transform: translate(-50px,60px) scale(0.94); }
        }
        /* Floating mid orbs — each with unique drift path */
        @keyframes fo1 {
          0%   { transform: translate(0px, 0px)   scale(1);    opacity:0.28; }
          25%  { transform: translate(120px,-80px) scale(1.15); opacity:0.38; }
          50%  { transform: translate(200px,40px)  scale(0.9);  opacity:0.22; }
          75%  { transform: translate(80px,130px)  scale(1.1);  opacity:0.34; }
          100% { transform: translate(0px, 0px)   scale(1);    opacity:0.28; }
        }
        @keyframes fo2 {
          0%   { transform: translate(0px,0px)     scale(1);    opacity:0.24; }
          30%  { transform: translate(-140px,60px) scale(1.2);  opacity:0.36; }
          60%  { transform: translate(-60px,160px) scale(0.88); opacity:0.20; }
          80%  { transform: translate(80px,80px)   scale(1.05); opacity:0.30; }
          100% { transform: translate(0px,0px)     scale(1);    opacity:0.24; }
        }
        @keyframes fo3 {
          0%   { transform: translate(0px,0px)      scale(1);    opacity:0.30; }
          20%  { transform: translate(60px,120px)   scale(1.12); opacity:0.42; }
          55%  { transform: translate(-100px,80px)  scale(0.92); opacity:0.26; }
          80%  { transform: translate(-40px,-100px) scale(1.08); opacity:0.36; }
          100% { transform: translate(0px,0px)      scale(1);    opacity:0.30; }
        }
        @keyframes fo4 {
          0%   { transform: translate(0px,0px)     scale(1);    opacity:0.22; }
          35%  { transform: translate(160px,-60px) scale(1.18); opacity:0.32; }
          65%  { transform: translate(100px,120px) scale(0.85); opacity:0.18; }
          85%  { transform: translate(-60px,60px)  scale(1.06); opacity:0.28; }
          100% { transform: translate(0px,0px)     scale(1);    opacity:0.22; }
        }
        @keyframes fo5 {
          0%   { transform: translate(0px,0px)      scale(1);    opacity:0.26; }
          40%  { transform: translate(-120px,-90px) scale(1.14); opacity:0.38; }
          70%  { transform: translate(60px,-140px)  scale(0.9);  opacity:0.20; }
          100% { transform: translate(0px,0px)      scale(1);    opacity:0.26; }
        }
        @keyframes fo6 {
          0%   { transform: translate(0px,0px)    scale(1);    opacity:0.20; }
          30%  { transform: translate(100px,90px) scale(1.16); opacity:0.32; }
          60%  { transform: translate(-80px,140px)scale(0.88); opacity:0.16; }
          100% { transform: translate(0px,0px)    scale(1);    opacity:0.20; }
        }
        @keyframes fo7 {
          0%   { transform: translate(0px,0px)      scale(1);    opacity:0.32; }
          25%  { transform: translate(-160px,40px)  scale(1.2);  opacity:0.44; }
          50%  { transform: translate(-100px,-120px)scale(0.9);  opacity:0.24; }
          75%  { transform: translate(40px,-80px)   scale(1.1);  opacity:0.36; }
          100% { transform: translate(0px,0px)      scale(1);    opacity:0.32; }
        }
        @keyframes fo8 {
          0%   { transform: translate(0px,0px)     scale(1);    opacity:0.18; }
          45%  { transform: translate(140px,-110px)scale(1.22); opacity:0.30; }
          75%  { transform: translate(60px,80px)   scale(0.86); opacity:0.14; }
          100% { transform: translate(0px,0px)     scale(1);    opacity:0.18; }
        }
        /* Scan beam */
        @keyframes scan {
          0% { transform: translateX(-100%) skewX(-15deg); opacity:0; }
          10% { opacity:0.6; }
          90% { opacity:0.3; }
          100% { transform: translateX(200%) skewX(-15deg); opacity:0; }
        }
        /* Slide transitions */
        @keyframes tv-enter {
          from { opacity:0; transform: translateY(24px) scale(0.99); }
          to { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes tv-exit {
          from { opacity:1; transform: translateY(0) scale(1); }
          to { opacity:0; transform: translateY(-16px) scale(1.005); }
        }
        @keyframes border-pulse {
          0%,100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
        .tv-slide { animation: tv-enter 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
        .tv-exit  { animation: tv-exit  0.5s cubic-bezier(0.4,0,1,1) forwards; }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        background: '#060412',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Animated orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {[
            { color: '#422c76', w: 900, h: 700, left: '-15%', top: '-20%', anim: 'orb1 28s ease-in-out infinite', opacity: 0.55 },
            { color: '#ff2f69', w: 700, h: 600, right: '-12%', bottom: '-18%', anim: 'orb2 34s ease-in-out infinite', opacity: 0.4 },
            { color: '#01E18E', w: 500, h: 500, left: '38%', top: '25%', anim: 'orb3 22s ease-in-out infinite', opacity: 0.22 },
            { color: '#7c3aed', w: 600, h: 500, right: '18%', top: '-15%', anim: 'orb4 40s ease-in-out infinite', opacity: 0.35 },
            { color: '#f59e0b', w: 350, h: 350, left: '12%', bottom: '8%', anim: 'orb5 26s ease-in-out infinite', opacity: 0.18 },
          ].map((orb, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: orb.w, height: orb.h,
              left: (orb as Record<string,unknown>).left as string | undefined,
              right: (orb as Record<string,unknown>).right as string | undefined,
              top: (orb as Record<string,unknown>).top as string | undefined,
              bottom: (orb as Record<string,unknown>).bottom as string | undefined,
              background: `radial-gradient(ellipse, ${orb.color} 0%, transparent 70%)`,
              filter: 'blur(60px)',
              animation: orb.anim,
              opacity: orb.opacity,
            }} />
          ))}

          {/* Scanning light beam */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '3px',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 60%, transparent)',
            animation: 'scan 8s linear infinite',
            animationDelay: '-3s',
          }} />
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '1px',
            background: 'linear-gradient(to bottom, transparent, rgba(1,225,142,0.3) 50%, transparent)',
            animation: 'scan 12s linear infinite',
            animationDelay: '-7s',
          }} />

          {/* Floating mid orbs — visible, colorful, drifting freely */}
          {([
            { left: '18%',  top: '22%', w: 320, h: 260, color: '#8b5cf6', anim: 'fo1 18s ease-in-out infinite',        delay: '0s'   },
            { left: '72%',  top: '15%', w: 280, h: 280, color: '#ff2f69', anim: 'fo2 22s ease-in-out infinite',        delay: '-6s'  },
            { left: '45%',  top: '55%', w: 340, h: 300, color: '#01E18E', anim: 'fo3 16s ease-in-out infinite',        delay: '-4s'  },
            { left: '85%',  top: '60%', w: 260, h: 240, color: '#f59e0b', anim: 'fo4 24s ease-in-out infinite',        delay: '-10s' },
            { left: '28%',  top: '72%', w: 300, h: 260, color: '#60a5fa', anim: 'fo5 20s ease-in-out infinite',        delay: '-3s'  },
            { left: '62%',  top: '38%', w: 240, h: 220, color: '#a855f7', anim: 'fo6 26s ease-in-out infinite',        delay: '-14s' },
            { left: '8%',   top: '50%', w: 280, h: 300, color: '#ff2f69', anim: 'fo7 14s ease-in-out infinite',        delay: '-7s'  },
            { left: '90%',  top: '30%', w: 220, h: 200, color: '#01E18E', anim: 'fo8 30s ease-in-out infinite',        delay: '-18s' },
          ] as const).map((o, i) => (
            <div key={`fo-${i}`} style={{
              position: 'absolute',
              left: o.left, top: o.top,
              width: o.w, height: o.h,
              background: `radial-gradient(ellipse, ${o.color} 0%, transparent 68%)`,
              filter: 'blur(55px)',
              animation: o.anim,
              animationDelay: o.delay,
              borderRadius: '50%',
            }} />
          ))}

          {/* Grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />
        </div>

        {/* Main slide content */}
        <div style={{ flex: 1, position: 'relative', zIndex: 10, overflow: 'hidden' }}>
          <div className={visible ? 'tv-slide' : 'tv-exit'} style={{ height: '100%' }}>
            {renderSlide()}
          </div>
        </div>

        {/* Bottom status bar */}
        <div style={{
          position: 'relative', zIndex: 20,
          background: 'rgba(6,4,18,0.85)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '10px 28px',
          display: 'flex', alignItems: 'center', gap: '20px',
        }}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_v2.png" alt="Forecast" style={{ height: '28px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.12)' }} />

          {/* Back to dashboard */}
          <Link
            href="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '11px', fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.2s, color 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            <ArrowLeft size={13} />
            Dashboard
          </Link>

          {/* Divider */}
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.12)' }} />

          {/* Slide label */}
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
              {SLIDES[current].label}
            </div>
            {/* Progress bar */}
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px', overflow: 'hidden', width: '280px' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(to right, #422c76, #ff2f69)',
                borderRadius: '1px',
                boxShadow: '0 0 8px rgba(255,47,105,0.6)',
                transition: 'width 0.1s linear',
              }} />
            </div>
          </div>

          {/* Slide dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {SLIDES.map((s, i) => (
              <button
                key={i}
                onClick={() => { setVisible(false); setTimeout(() => { setCurrent(i); setProgress(0); setVisible(true) }, 400) }}
                style={{
                  width: i === current ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: i === current ? '#ff2f69' : 'rgba(255,255,255,0.2)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: i === current ? '0 0 8px rgba(255,47,105,0.8)' : 'none',
                }}
                title={s.label}
              />
            ))}
          </div>

          {/* Data refresh indicator */}
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', textAlign: 'right', lineHeight: 1.4 }}>
            <div>Dados atualizados</div>
            <div style={{ color: 'rgba(1,225,142,0.6)', fontWeight: 600 }}>
              {new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.12)' }} />

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px', border: 'none',
              background: isFullscreen ? 'rgba(1,225,142,0.15)' : 'rgba(255,255,255,0.06)',
              color: isFullscreen ? '#01E18E' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isFullscreen ? 'rgba(1,225,142,0.15)' : 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = isFullscreen ? '#01E18E' : 'rgba(255,255,255,0.5)'
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.12)' }} />
          <Clock />
        </div>
      </div>
    </>
  )
}
