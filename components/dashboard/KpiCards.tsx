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
  const fcDesvio = fcTotal - planTotal
  const fcPositivo = fcDesvio >= 0

  // Dynamic colors for achievement
  const atingColor = atingimentoPct >= 100 ? '#01E18E' : atingimentoPct >= 80 ? '#f59e0b' : '#ff2f69'
  const mbColor = mbPct >= 5 ? '#01E18E' : mbPct >= 0 ? '#f59e0b' : '#ff2f69'

  const cards = [
    {
      label: 'Plano Anual 2026',
      value: formatMillions(planTotal),
      sub: 'Orçamento aprovado',
      icon: Target,
      accentColor: '#422c76',
      iconBg: 'rgba(66,44,118,0.12)',
    },
    {
      label: 'FC Revisado 2026',
      value: formatMillions(fcTotal),
      sub: `${fcPositivo ? '+' : ''}${formatCurrency(fcDesvio)} vs plano`,
      icon: fcPositivo ? TrendingUp : TrendingDown,
      accentColor: '#ff2f69',
      iconBg: 'rgba(255,47,105,0.1)',
    },
    {
      label: 'Faturado YTD',
      value: formatMillions(faturadoYtd),
      sub: `${formatPercent(atingimentoPct)} do plano acumulado`,
      icon: DollarSign,
      accentColor: '#01E18E',
      iconBg: 'rgba(1,225,142,0.12)',
    },
    {
      label: '% Atingimento YTD',
      value: formatPercent(atingimentoPct),
      sub: 'Plano acumulado até o mês',
      icon: Zap,
      accentColor: atingColor,
      iconBg: `rgba(${atingimentoPct >= 100 ? '1,225,142' : atingimentoPct >= 80 ? '245,158,11' : '255,47,105'},0.1)`,
    },
    {
      label: 'MB% Realizada YTD',
      value: formatPercent(mbPct),
      sub: 'Margem bruta realizada',
      icon: Percent,
      accentColor: mbColor,
      iconBg: `rgba(${mbPct >= 5 ? '1,225,142' : mbPct >= 0 ? '245,158,11' : '255,47,105'},0.1)`,
    },
  ]

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: '#9a8fb5' }}
        >
          Indicadores Consolidados
        </h2>
        {lastSync && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#b8b0ca' }}>
            <Clock className="w-3 h-3" />
            Atualizado {format(new Date(lastSync), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </div>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-2xl p-4 space-y-3 transition-transform hover:-translate-y-0.5"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(66,44,118,0.08)',
                boxShadow: '0 2px 12px rgba(66,44,118,0.06)',
                borderLeft: `3px solid ${card.accentColor}`,
              }}
            >
              <div className="flex items-start justify-between">
                <span
                  className="text-[11px] font-semibold leading-snug pr-2"
                  style={{ color: '#6b6570' }}
                >
                  {card.label}
                </span>
                <div
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ background: card.iconBg }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: card.accentColor }} />
                </div>
              </div>
              <p
                className="text-2xl font-bold tracking-tight"
                style={{ color: card.accentColor }}
              >
                {card.value}
              </p>
              <p className="text-[10px]" style={{ color: '#b8b0ca' }}>
                {card.sub}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
