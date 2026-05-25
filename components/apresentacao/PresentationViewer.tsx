'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  MonitorPlay, X,
} from 'lucide-react'
import type { PresentationData } from './types'
import { MONTHS } from '@/lib/utils'

import { SlideCover } from './slides/SlideCover'
import { SlideDisclaimer } from './slides/SlideDisclaimer'
import { SlideSection } from './slides/SlideSection'
import { SlideDashboard } from './slides/SlideDashboard'
import { SlideVolumeProfit } from './slides/SlideVolumeProfit'
import { SlideDRE } from './slides/SlideDRE'
import { SlideClientFocus } from './slides/SlideClientFocus'
import { SlideHeadcount } from './slides/SlideHeadcount'
import { SlideCorporateExpenses } from './slides/SlideCorporateExpenses'
import { SlidePipeline } from './slides/SlidePipeline'
import { SlideCashFlow } from './slides/SlideCashFlow'
import { SlideIndicators } from './slides/SlideIndicators'
import { SlideMarketing } from './slides/SlideMarketing'
import { SlideStrategicPlanning } from './slides/SlideStrategicPlanning'
import { SlideClosing } from './slides/SlideClosing'

type SlideDefinition =
  | { type: 'cover'; id: number }
  | { type: 'disclaimer'; id: number }
  | { type: 'section'; id: number; title: string; subtitle?: string }
  | { type: 'dashboard'; id: number }
  | { type: 'volume-profit'; id: number }
  | { type: 'dre'; id: number; variant: 'monthly' | 'ytd' }
  | { type: 'client-focus'; id: number; entity: string }
  | { type: 'headcount'; id: number }
  | { type: 'corporate-expenses'; id: number }
  | { type: 'pipeline'; id: number }
  | { type: 'cashflow'; id: number }
  | { type: 'indicators'; id: number }
  | { type: 'marketing'; id: number }
  | { type: 'strategic'; id: number }
  | { type: 'closing'; id: number }

const SLIDES: SlideDefinition[] = [
  { id: 0, type: 'cover' },
  { id: 1, type: 'disclaimer' },
  { id: 2, type: 'section', title: 'Resultados Operacionais' },
  { id: 3, type: 'dashboard' },
  { id: 4, type: 'volume-profit' },
  { id: 5, type: 'dre', variant: 'monthly' },
  { id: 6, type: 'dre', variant: 'ytd' },
  { id: 7, type: 'section', title: 'Foco no Cliente' },
  { id: 8, type: 'client-focus', entity: 'VCI' },
  { id: 9, type: 'client-focus', entity: 'ARM-GRV' },
  { id: 10, type: 'client-focus', entity: 'ARM-ITV' },
  { id: 11, type: 'client-focus', entity: 'ARM-NVG' },
  { id: 12, type: 'client-focus', entity: 'TRP' },
  { id: 13, type: 'section', title: 'Recursos Humanos' },
  { id: 14, type: 'headcount' },
  { id: 15, type: 'corporate-expenses' },
  { id: 16, type: 'section', title: 'Comercial' },
  { id: 17, type: 'pipeline' },
  { id: 18, type: 'section', title: 'Marketing & Comunicação' },
  { id: 19, type: 'marketing' },
  { id: 20, type: 'section', title: 'Financeiro' },
  { id: 21, type: 'cashflow' },
  { id: 22, type: 'indicators' },
  { id: 23, type: 'strategic' },
  { id: 24, type: 'closing' },
]

const SLIDE_LABELS: Record<SlideDefinition['type'], string> = {
  cover: 'Capa',
  disclaimer: 'Declarações',
  section: 'Seção',
  dashboard: 'Dashboard',
  'volume-profit': 'Volume & Lucro',
  dre: 'DRE',
  'client-focus': 'Cliente',
  headcount: 'Headcount',
  'corporate-expenses': 'Despesas',
  pipeline: 'Pipeline',
  cashflow: 'Fluxo Caixa',
  indicators: 'Indicadores',
  marketing: 'Marketing',
  strategic: 'Estratégia',
  closing: 'Encerramento',
}

function slideLabel(slide: SlideDefinition): string {
  if (slide.type === 'section') return slide.title
  if (slide.type === 'client-focus') return slide.entity
  if (slide.type === 'dre') return slide.variant === 'ytd' ? 'DRE YTD' : 'DRE Mensal'
  return SLIDE_LABELS[slide.type]
}

interface Props {
  data: PresentationData
  initialMonth: number
}

function SlideRenderer({
  slide,
  data,
  month,
  onMonthChange,
}: {
  slide: SlideDefinition
  data: PresentationData
  month: number
  onMonthChange: (m: number) => void
}) {
  switch (slide.type) {
    case 'cover': return <SlideCover data={data} month={month} onMonthChange={onMonthChange} />
    case 'disclaimer': return <SlideDisclaimer data={data} month={month} />
    case 'section': return <SlideSection data={data} month={month} title={slide.title} subtitle={slide.subtitle} />
    case 'dashboard': return <SlideDashboard data={data} month={month} />
    case 'volume-profit': return <SlideVolumeProfit data={data} month={month} />
    case 'dre': return <SlideDRE data={data} month={month} variant={slide.variant} />
    case 'client-focus': return <SlideClientFocus data={data} month={month} entity={slide.entity} />
    case 'headcount': return <SlideHeadcount data={data} month={month} />
    case 'corporate-expenses': return <SlideCorporateExpenses data={data} month={month} />
    case 'pipeline': return <SlidePipeline data={data} month={month} />
    case 'cashflow': return <SlideCashFlow data={data} month={month} />
    case 'indicators': return <SlideIndicators data={data} month={month} />
    case 'marketing': return <SlideMarketing data={data} month={month} />
    case 'strategic': return <SlideStrategicPlanning data={data} month={month} />
    case 'closing': return <SlideClosing data={data} month={month} />
    default: return null
  }
}

function ThumbnailSlide({ slide, active, onClick }: { slide: SlideDefinition; active: boolean; onClick: () => void }) {
  const typeColors: Record<string, string> = {
    cover: '#2E2657', closing: '#2E2657', section: '#1e1840',
    dashboard: '#422c76', 'volume-profit': '#00A066', dre: '#2E2657',
    'client-focus': '#F23A5A', headcount: '#f59e0b', 'corporate-expenses': '#6b7280',
    pipeline: '#0099CC', cashflow: '#2E2657', indicators: '#422c76',
    marketing: '#F23A5A', strategic: '#2E2657', disclaimer: '#414042',
  }
  const bg = typeColors[slide.type] ?? '#2E2657'

  return (
    <button
      onClick={onClick}
      style={{
        width: '80px',
        height: '46px',
        flexShrink: 0,
        borderRadius: '4px',
        overflow: 'hidden',
        border: active ? '2px solid #F23A5A' : '2px solid transparent',
        cursor: 'pointer',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        transition: 'border-color 0.15s',
        position: 'relative',
      }}
    >
      {/* Slide number */}
      <div style={{
        position: 'absolute', top: '2px', left: '3px',
        color: 'rgba(255,255,255,0.4)', fontSize: '7px', fontWeight: 700,
      }}>
        {slide.id + 1}
      </div>
      <div style={{ color: '#fff', fontSize: '7px', fontWeight: 700, textAlign: 'center', lineHeight: 1.2, padding: '0 2px' }}>
        {slideLabel(slide)}
      </div>
      {active && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '2px', background: '#F23A5A',
        }} />
      )}
    </button>
  )
}

export function PresentationViewer({ data, initialMonth }: Props) {
  const [current, setCurrent] = useState(0)
  const [month, setMonth] = useState(initialMonth)
  const [scale, setScale] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const thumbnailRef = useRef<HTMLDivElement>(null)

  const updateScale = useCallback(() => {
    const el = canvasWrapperRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const s = Math.min(width / 960, height / 540) * 0.97
    setScale(s)
  }, [])

  useEffect(() => {
    updateScale()
    const ro = new ResizeObserver(updateScale)
    if (canvasWrapperRef.current) ro.observe(canvasWrapperRef.current)
    return () => ro.disconnect()
  }, [updateScale, isFullscreen])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        setCurrent(c => Math.min(c + 1, SLIDES.length - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setCurrent(c => Math.max(c - 1, 0))
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen()
      } else if (e.key === 'Home') {
        setCurrent(0)
      } else if (e.key === 'End') {
        setCurrent(SLIDES.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll active thumbnail into view
  useEffect(() => {
    const thumb = thumbnailRef.current
    if (!thumb) return
    const active = thumb.children[current] as HTMLElement | undefined
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [current])

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error)
    } else {
      exitFullscreen()
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
  }

  const slide = SLIDES[current]
  const monthName = MONTHS[month - 1]

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0d0821',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top control bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#2E2657',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Month selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 600 }}>Mês:</span>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '5px',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1} style={{ background: '#2E2657' }}>{m}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Slide counter */}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600 }}>
          {current + 1} / {SLIDES.length}
        </div>

        {/* Current slide label */}
        <div style={{
          flex: 1, textAlign: 'center',
          color: '#fff', fontSize: '11px', fontWeight: 700,
        }}>
          {slideLabel(slide)}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: '6px' }}>· {monthName} {data.year}</span>
        </div>

        {/* Navigation */}
        <button
          onClick={() => setCurrent(c => Math.max(c - 1, 0))}
          disabled={current === 0}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            borderRadius: '5px', color: '#fff', cursor: current === 0 ? 'not-allowed' : 'pointer',
            padding: '5px 8px', display: 'flex', alignItems: 'center',
            opacity: current === 0 ? 0.3 : 1,
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => setCurrent(c => Math.min(c + 1, SLIDES.length - 1))}
          disabled={current === SLIDES.length - 1}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            borderRadius: '5px', color: '#fff', cursor: current === SLIDES.length - 1 ? 'not-allowed' : 'pointer',
            padding: '5px 8px', display: 'flex', alignItems: 'center',
            opacity: current === SLIDES.length - 1 ? 0.3 : 1,
          }}
        >
          <ChevronRight size={14} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            borderRadius: '5px', color: '#fff', cursor: 'pointer',
            padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px',
          }}
          title={isFullscreen ? 'Sair do fullscreen (Esc)' : 'Tela cheia (F)'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        {/* Keyboard hint */}
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>
          ← → | F = fullscreen
        </div>
      </div>

      {/* Slide canvas area */}
      <div
        ref={canvasWrapperRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={e => {
          // Click right half to advance, left half to go back
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const x = e.clientX - rect.left
          if (x > rect.width / 2) {
            setCurrent(c => Math.min(c + 1, SLIDES.length - 1))
          } else {
            setCurrent(c => Math.max(c - 1, 0))
          }
        }}
      >
        {/* Shadow around slide */}
        <div
          style={{
            width: '960px',
            height: '540px',
            transformOrigin: 'center center',
            transform: `scale(${scale})`,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            borderRadius: '2px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
          onClick={e => e.stopPropagation()}
        >
          <SlideRenderer
            slide={slide}
            data={data}
            month={month}
            onMonthChange={setMonth}
          />
        </div>

        {/* Click zones indicators (visible on hover) */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '15%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.2s',
          pointerEvents: 'none',
        }}
          className="click-zone-left"
        >
          <ChevronLeft size={32} color="rgba(255,255,255,0.4)" />
        </div>
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '15%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.2s',
          pointerEvents: 'none',
        }}
          className="click-zone-right"
        >
          <ChevronRight size={32} color="rgba(255,255,255,0.4)" />
        </div>
      </div>

      {/* Thumbnail bar */}
      {!isFullscreen && (
        <div style={{
          background: '#1a0f3c',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 12px',
          flexShrink: 0,
        }}>
          <div
            ref={thumbnailRef}
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}
          >
            {SLIDES.map((s, i) => (
              <ThumbnailSlide
                key={s.id}
                slide={s}
                active={i === current}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
