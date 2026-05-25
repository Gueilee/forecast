'use client'

import { SlideBase } from '../SlideBase'
import type { SlideProps } from '../types'

const INDICATORS = [
  {
    category: 'Operacional',
    color: '#422c76',
    items: [
      { name: 'On-Time Delivery (OTD)', value: '96.8%', target: '95%', status: 'ok' },
      { name: 'Acuracidade de Estoque', value: '99.2%', target: '99%', status: 'ok' },
      { name: 'Nível de Serviço (Fill Rate)', value: '98.1%', target: '97%', status: 'ok' },
      { name: 'Devoluções / Avarias', value: '0.18%', target: '<0.5%', status: 'ok' },
    ],
  },
  {
    category: 'Financeiro',
    color: '#F23A5A',
    items: [
      { name: 'Inadimplência (DPO)', value: '3.2%', target: '<5%', status: 'ok' },
      { name: 'Ciclo de Caixa (dias)', value: '18d', target: '<25d', status: 'ok' },
      { name: 'EBITDA Margin', value: '14.5%', target: '15%', status: 'warn' },
      { name: 'ROI Investimentos', value: '22.4%', target: '20%', status: 'ok' },
    ],
  },
  {
    category: 'Comercial',
    color: '#00E190',
    items: [
      { name: 'NPS (Net Promoter Score)', value: '72', target: '>65', status: 'ok' },
      { name: 'Churn Rate', value: '1.8%', target: '<3%', status: 'ok' },
      { name: 'Ticket Médio (R$)', value: 'R$ 48K', target: 'R$ 45K', status: 'ok' },
      { name: 'Taxa de Conversão', value: '28%', target: '25%', status: 'ok' },
    ],
  },
]

const STATUS_CONFIG = {
  ok: { color: '#00C07A', bg: '#00E19018', label: '✓' },
  warn: { color: '#f59e0b', bg: '#f59e0b18', label: '⚠' },
  alert: { color: '#F23A5A', bg: '#F23A5A18', label: '✗' },
}

export function SlideIndicators({ data, month }: SlideProps) {
  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''

  return (
    <SlideBase
      title="Indicadores Corporativos"
      subtitle={`Performance KPIs · ${monthName} ${data.year}`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', gap: '10px' }}>
        {INDICATORS.map(group => (
          <div key={group.category} style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: group.color, padding: '8px 12px', color: '#fff', fontSize: '10px', fontWeight: 700 }}>
              {group.category}
            </div>
            <div style={{ padding: '4px 0' }}>
              {group.items.map((item, i) => {
                const sc = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]
                return (
                  <div key={item.name} style={{
                    padding: '10px 12px',
                    borderBottom: i < group.items.length - 1 ? '1px solid rgba(66,44,118,0.07)' : 'none',
                    background: i % 2 === 0 ? '#fff' : '#faf9fd',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#414042', fontSize: '9.5px', fontWeight: 600, lineHeight: 1.3 }}>{item.name}</div>
                        <div style={{ color: '#9a8fb5', fontSize: '8px', marginTop: '2px' }}>Meta: {item.target}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#2E2657', fontSize: '16px', fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 7px', borderRadius: '4px',
                            background: sc.bg, color: sc.color, fontWeight: 700, fontSize: '8.5px',
                          }}>
                            {sc.label} {item.status === 'ok' ? 'OK' : item.status === 'warn' ? 'Atenção' : 'Crítico'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </SlideBase>
  )
}
