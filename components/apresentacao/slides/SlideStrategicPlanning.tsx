'use client'

import { SlideBase } from '../SlideBase'
import type { SlideProps } from '../types'

const PILLARS = [
  {
    title: 'Crescimento de Receita',
    color: '#422c76',
    target: 'R$ 850M até 2030',
    initiatives: [
      { name: 'Expansão Rede 4PL', years: [2025, 2026], status: 'em_andamento' },
      { name: 'Novos Verticais (Pharma, Auto)', years: [2026, 2027], status: 'planejado' },
      { name: 'Internacionalização (LATAM)', years: [2027, 2028], status: 'planejado' },
    ],
  },
  {
    title: 'Excelência Operacional',
    color: '#00E190',
    target: 'OTD > 98% · MB > 18%',
    initiatives: [
      { name: 'WMS Next-Gen (TMS)', years: [2025, 2026], status: 'em_andamento' },
      { name: 'Automação Armazéns', years: [2026, 2027], status: 'planejado' },
      { name: 'BI & Analytics 4.0', years: [2025, 2026], status: 'em_andamento' },
    ],
  },
  {
    title: 'Talentos & Cultura',
    color: '#F23A5A',
    target: 'Employer Brand Top 10',
    initiatives: [
      { name: 'Academia Vendemmia', years: [2025, 2026], status: 'em_andamento' },
      { name: 'Programa Liderança', years: [2026, 2027], status: 'planejado' },
      { name: 'ESG & Sustentabilidade', years: [2025, 2030], status: 'em_andamento' },
    ],
  },
]

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030]

const STATUS_COLORS = {
  em_andamento: { color: '#00E190', label: 'Em andamento' },
  planejado: { color: '#f59e0b', label: 'Planejado' },
  concluido: { color: '#9a8fb5', label: 'Concluído' },
}

export function SlideStrategicPlanning({ data }: SlideProps) {
  return (
    <SlideBase
      title="Planejamento Estratégico 2025–2030"
      subtitle="Visão de longo prazo · Pilares e Iniciativas"
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Vision statement */}
        <div style={{
          background: '#2E2657',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ width: '4px', height: '32px', background: '#00E190', borderRadius: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Visão 2030</div>
            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>
              Ser o principal operador logístico 4PL do Brasil, referência em tecnologia, cultura e resultado para nossos clientes
            </div>
          </div>
        </div>

        {/* Pillars + roadmap */}
        <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
          {PILLARS.map(pillar => (
            <div key={pillar.title} style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: pillar.color, padding: '8px 12px' }}>
                <div style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>{pillar.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', marginTop: '2px' }}>{pillar.target}</div>
              </div>

              {/* Year header */}
              <div style={{ display: 'flex', padding: '4px 8px', borderBottom: '1px solid rgba(66,44,118,0.1)' }}>
                <div style={{ width: '100px', fontSize: '7.5px', color: '#9a8fb5', fontWeight: 600 }}>Iniciativa</div>
                {YEARS.map(y => (
                  <div key={y} style={{ flex: 1, textAlign: 'center', fontSize: '7.5px', color: '#9a8fb5', fontWeight: 600 }}>
                    {y}
                  </div>
                ))}
              </div>

              {/* Initiatives as Gantt */}
              <div style={{ flex: 1, padding: '4px 0' }}>
                {pillar.initiatives.map((init, i) => {
                  const sc = STATUS_COLORS[init.status as keyof typeof STATUS_COLORS]
                  const startIdx = YEARS.indexOf(init.years[0])
                  const endIdx = YEARS.indexOf(init.years[1])

                  return (
                    <div key={init.name} style={{
                      display: 'flex', alignItems: 'center',
                      padding: '6px 8px',
                      background: i % 2 === 0 ? '#fff' : '#faf9fd',
                      borderBottom: '1px solid rgba(66,44,118,0.05)',
                    }}>
                      <div style={{ width: '100px', fontSize: '8.5px', color: '#414042', fontWeight: 600, lineHeight: 1.2 }}>
                        {init.name}
                      </div>
                      {YEARS.map((_, yi) => {
                        const active = yi >= startIdx && yi <= endIdx
                        return (
                          <div key={yi} style={{ flex: 1, height: '14px', padding: '0 1px' }}>
                            {active && (
                              <div style={{
                                height: '100%',
                                background: `${sc.color}30`,
                                border: `1px solid ${sc.color}`,
                                borderRadius: yi === startIdx ? '6px 0 0 6px' : yi === endIdx ? '0 6px 6px 0' : '0',
                                ...(startIdx === endIdx ? { borderRadius: '6px' } : {}),
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div style={{ padding: '6px 8px', background: 'rgba(46,38,87,0.04)', borderTop: '1px solid rgba(66,44,118,0.07)', display: 'flex', gap: '8px' }}>
                {Object.entries(STATUS_COLORS).map(([, sc]) => (
                  <div key={sc.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: sc.color }} />
                    <span style={{ fontSize: '7.5px', color: '#9a8fb5' }}>{sc.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideBase>
  )
}
