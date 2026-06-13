'use client'

import { formatMillions, formatPercent, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, Clock, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface KpiCardsProps {
  planTotal: number
  fcTotal: number
  faturadoYtd: number
  atingimentoPct: number
  mbPct: number
  lastSync: Date | null
}

export function KpiCards({ planTotal, fcTotal, faturadoYtd, atingimentoPct, mbPct, lastSync }: KpiCardsProps) {
  const fcDesvio    = fcTotal - planTotal
  const fcPositivo  = fcDesvio >= 0
  const atingColor  = atingimentoPct >= 100 ? '#01E18E' : atingimentoPct >= 80 ? '#f59e0b' : '#ff2f69'
  const mbColor     = mbPct >= 5 ? '#01E18E' : mbPct >= 0 ? '#f59e0b' : '#ff2f69'

  const cards = [
    {
      label: 'Plano Anual 2026',
      value: formatMillions(planTotal),
      sub: 'Orçamento aprovado',
      icon: Target,
      accent: '#422c76',
      iconBg: 'rgba(66,44,118,0.1)',
    },
    {
      label: 'FC Revisado 2026',
      value: formatMillions(fcTotal),
      sub: `${fcPositivo ? '+' : ''}${formatCurrency(fcDesvio)} vs plano`,
      icon: fcPositivo ? TrendingUp : TrendingDown,
      accent: '#ff2f69',
      iconBg: 'rgba(255,47,105,0.08)',
    },
    {
      label: 'Faturado YTD',
      value: formatMillions(faturadoYtd),
      sub: `${formatPercent(atingimentoPct)} do plano acumulado`,
      icon: DollarSign,
      accent: '#01E18E',
      iconBg: 'rgba(1,225,142,0.1)',
    },
    {
      label: '% Atingimento YTD',
      value: formatPercent(atingimentoPct),
      sub: 'Plano acumulado até o mês',
      icon: Zap,
      accent: atingColor,
      iconBg: `rgba(${atingimentoPct >= 100 ? '1,225,142' : atingimentoPct >= 80 ? '245,158,11' : '255,47,105'},0.08)`,
    },
    {
      label: 'MB% Realizada YTD',
      value: formatPercent(mbPct),
      sub: 'Margem bruta realizada',
      icon: Percent,
      accent: mbColor,
      iconBg: `rgba(${mbPct >= 5 ? '1,225,142' : mbPct >= 0 ? '245,158,11' : '255,47,105'},0.08)`,
    },
  ]

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#b8b0ca' }}>
          Indicadores Consolidados · 2026
        </span>
        {lastSync && (
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#b8b0ca' }}>
            <Clock className="w-3 h-3" />
            Atualizado {format(new Date(lastSync), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-2xl p-4 relative overflow-hidden cursor-default group transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(66,44,118,0.07)',
                boxShadow: '0 2px 8px rgba(66,44,118,0.05)',
              }}
            >
              {/* Colored top strip */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: card.accent }}
              />

              {/* Icon */}
              <div className="flex items-center justify-between mb-3 mt-1">
                <div className="p-2 rounded-xl" style={{ background: card.iconBg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: card.accent }} />
                </div>
              </div>

              {/* Value */}
              <p className="text-[22px] font-black tracking-tight leading-none mb-1.5" style={{ color: card.accent }}>
                {card.value}
              </p>

              {/* Label */}
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#414042' }}>
                {card.label}
              </p>

              {/* Sub */}
              <p className="text-[10px] leading-snug" style={{ color: '#b8b0ca' }}>
                {card.sub}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
