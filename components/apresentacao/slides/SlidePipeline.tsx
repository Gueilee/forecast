'use client'

import { SlideBase, fmt } from '../SlideBase'
import type { SlideProps } from '../types'

const PIPELINE_STAGES = [
  { stage: 'Prospecção', count: 48, value: 28_500_000, pct: 10 },
  { stage: 'Qualificação', count: 31, value: 22_000_000, pct: 25 },
  { stage: 'Proposta Enviada', count: 19, value: 18_300_000, pct: 40 },
  { stage: 'Negociação', count: 12, value: 14_200_000, pct: 65 },
  { stage: 'Contrato', count: 8, value: 9_800_000, pct: 85 },
  { stage: 'Fechamento', count: 5, value: 6_500_000, pct: 95 },
]

const TOP_DEALS = [
  { name: 'Empresa Alpha S.A.', segment: 'E-Commerce', stage: 'Negociação', value: 3_200_000, prob: 75 },
  { name: 'Beta Logística LTDA', segment: 'Varejo', stage: 'Proposta', value: 2_800_000, prob: 45 },
  { name: 'Gamma Indústria', segment: 'Manufatura', stage: 'Contrato', value: 2_100_000, prob: 90 },
  { name: 'Delta Commerce', segment: 'E-Commerce', stage: 'Negociação', value: 1_900_000, prob: 70 },
  { name: 'Epsilon Dist.', segment: 'Distribuição', stage: 'Qualificação', value: 1_600_000, prob: 30 },
  { name: 'Zeta Foods', segment: 'Food & Bev', stage: 'Proposta', value: 1_400_000, prob: 50 },
]

const STAGE_COLORS: Record<string, string> = {
  Prospecção: '#9a8fb5',
  Qualificação: '#2E2657',
  'Proposta Enviada': '#422c76',
  Negociação: '#f59e0b',
  Contrato: '#00E190',
  Fechamento: '#00C07A',
  Proposta: '#422c76',
}

export function SlidePipeline({ data, month }: SlideProps) {
  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''
  const totalPipeline = PIPELINE_STAGES.reduce((s, st) => s + st.value, 0)
  const weightedPipeline = PIPELINE_STAGES.reduce((s, st) => s + st.value * st.pct / 100, 0)

  const maxCount = Math.max(...PIPELINE_STAGES.map(s => s.count))

  return (
    <SlideBase
      title="Pipeline Comercial"
      subtitle={`Comercial · ${monthName} ${data.year}`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', gap: '10px' }}>
        {/* Left: Funnel */}
        <div style={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'Pipeline Total', val: fmt(totalPipeline), color: '#2E2657' },
              { label: 'Pipeline Ponderado', val: fmt(weightedPipeline), color: '#00E190' },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '7px', padding: '8px 10px', borderLeft: `3px solid ${k.color}` }}>
                <div style={{ color: '#9a8fb5', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                <div style={{ color: '#2E2657', fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
            <div style={{ color: '#2E2657', fontSize: '9.5px', fontWeight: 700, marginBottom: '6px' }}>
              Funil de Vendas
            </div>
            {PIPELINE_STAGES.map(stage => {
              const color = STAGE_COLORS[stage.stage] ?? '#2E2657'
              const width = (stage.count / maxCount) * 100
              return (
                <div key={stage.stage} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '90px', fontSize: '8.5px', color: '#414042', fontWeight: 600 }}>
                    {stage.stage}
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: '18px' }}>
                    <div style={{
                      height: '100%',
                      width: `${width}%`,
                      background: color,
                      borderRadius: '3px',
                      transition: 'width 0.3s',
                      display: 'flex', alignItems: 'center', paddingLeft: '8px',
                    }}>
                      <span style={{ color: '#fff', fontSize: '8px', fontWeight: 700 }}>{stage.count}</span>
                    </div>
                  </div>
                  <div style={{ width: '60px', textAlign: 'right', color: '#2E2657', fontSize: '9px', fontWeight: 600 }}>
                    {fmt(stage.value)}
                  </div>
                  <div style={{ width: '28px', textAlign: 'right', color: '#9a8fb5', fontSize: '8.5px' }}>
                    {stage.pct}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Top deals */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#2E2657', padding: '8px 12px', color: '#fff', fontSize: '9.5px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Principais Oportunidades</span>
            <span style={{ color: '#00E190', fontSize: '8.5px' }}>{TOP_DEALS.length} oportunidades</span>
          </div>
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(46,38,87,0.06)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#2E2657', fontWeight: 700 }}>Empresa</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#2E2657', fontWeight: 700 }}>Segmento</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#2E2657', fontWeight: 700 }}>Estágio</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Valor</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Prob.</th>
                </tr>
              </thead>
              <tbody>
                {TOP_DEALS.map((deal, i) => {
                  const stageColor = STAGE_COLORS[deal.stage] ?? '#2E2657'
                  return (
                    <tr key={deal.name} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fd', borderBottom: '1px solid rgba(66,44,118,0.06)' }}>
                      <td style={{ padding: '7px 10px', color: '#414042', fontWeight: 600, fontSize: '9px' }}>{deal.name}</td>
                      <td style={{ padding: '7px 8px', color: '#9a8fb5', fontSize: '8.5px' }}>{deal.segment}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '4px', background: `${stageColor}18`, color: stageColor, fontWeight: 700, fontSize: '8px' }}>
                          {deal.stage}
                        </span>
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>
                        {fmt(deal.value)}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: deal.prob >= 70 ? '#00E190' : deal.prob >= 45 ? '#f59e0b' : '#F23A5A', fontWeight: 700, fontSize: '9px' }}>
                        {deal.prob}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '6px 12px', background: 'rgba(46,38,87,0.04)', borderTop: '1px solid rgba(66,44,118,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9a8fb5', fontSize: '8.5px', fontStyle: 'italic' }}>* Dados ilustrativos — integração CRM em implementação</span>
            <span style={{ color: '#2E2657', fontSize: '9px', fontWeight: 700 }}>{TOP_DEALS.reduce((s, d) => s + d.value, 0) > 0 ? fmt(TOP_DEALS.reduce((s, d) => s + d.value, 0)) : ''}</span>
          </div>
        </div>
      </div>
    </SlideBase>
  )
}
