'use client'

import { SlideBase } from '../SlideBase'
import type { SlideProps } from '../types'

const CAMPAIGNS = [
  { name: 'Vendemmia 4PL Academy', type: 'Educacional', status: 'Ativo', reach: '12.4K', leads: 84, investment: 'R$ 28K' },
  { name: 'Reforma Tributária 2025', type: 'Conteúdo', status: 'Ativo', reach: '28.7K', leads: 156, investment: 'R$ 12K' },
  { name: 'Cases de Sucesso ARM', type: 'Social', status: 'Ativo', reach: '9.8K', leads: 45, investment: 'R$ 8K' },
  { name: 'Webinar: Logística 4.0', type: 'Evento', status: 'Concluído', reach: '4.2K', leads: 210, investment: 'R$ 18K' },
  { name: 'LinkedIn Ads Q2', type: 'Pago', status: 'Ativo', reach: '52K', leads: 88, investment: 'R$ 35K' },
]

const CHANNELS = [
  { channel: 'LinkedIn', followers: '8.4K', growth: '+12%', posts: 18, engagement: '4.2%' },
  { channel: 'Instagram', followers: '3.1K', growth: '+8%', posts: 24, engagement: '3.8%' },
  { channel: 'Site / Blog', followers: '22K visitas', growth: '+18%', posts: 12, engagement: '2m15s' },
  { channel: 'E-mail Mktg.', followers: '4.8K subs.', growth: '+5%', posts: 8, engagement: '32% abertura' },
]

const STATUS_COLORS: Record<string, string> = {
  Ativo: '#00E190',
  Concluído: '#9a8fb5',
  Planejado: '#f59e0b',
}

export function SlideMarketing({ data, month }: SlideProps) {
  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''
  const totalLeads = CAMPAIGNS.reduce((s, c) => s + c.leads, 0)

  return (
    <SlideBase
      title="Marketing & Comunicação"
      subtitle={`Campanhas e Canais Digitais · ${monthName} ${data.year}`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', gap: '10px' }}>
        {/* Left: Campaigns */}
        <div style={{ flex: '0 0 58%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'Campanhas Ativas', val: String(CAMPAIGNS.filter(c => c.status === 'Ativo').length), color: '#00E190' },
              { label: 'Total Leads', val: String(totalLeads), color: '#2E2657' },
              { label: 'Investimento', val: 'R$ 101K', color: '#F23A5A' },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '7px', padding: '8px 10px', borderLeft: `3px solid ${k.color}` }}>
                <div style={{ color: '#9a8fb5', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                <div style={{ color: '#2E2657', fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#2E2657', padding: '7px 12px', color: '#fff', fontSize: '9.5px', fontWeight: 700 }}>
              Campanhas em andamento
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ background: 'rgba(46,38,87,0.06)' }}>
                  <th style={{ padding: '5px 10px', textAlign: 'left', color: '#2E2657', fontWeight: 700 }}>Campanha</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', color: '#2E2657', fontWeight: 700 }}>Tipo</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', color: '#2E2657', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Alcance</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Leads</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Invest.</th>
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS.map((c, i) => {
                  const sc = STATUS_COLORS[c.status] ?? '#9a8fb5'
                  return (
                    <tr key={c.name} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fd', borderBottom: '1px solid rgba(66,44,118,0.05)' }}>
                      <td style={{ padding: '6px 10px', color: '#414042', fontWeight: 600, fontSize: '8.5px' }}>{c.name}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: '#9a8fb5', fontSize: '8.5px' }}>{c.type}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: `${sc}18`, color: sc, fontWeight: 700, fontSize: '8px' }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 600, fontSize: '8.5px' }}>{c.reach}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700, fontSize: '8.5px' }}>{c.leads}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9a8fb5', fontSize: '8.5px' }}>{c.investment}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Channels */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', flex: 1 }}>
            <div style={{ background: '#422c76', padding: '7px 12px', color: '#fff', fontSize: '9.5px', fontWeight: 700 }}>
              Canais Digitais
            </div>
            {CHANNELS.map((ch, i) => (
              <div key={ch.channel} style={{
                padding: '10px 12px',
                background: i % 2 === 0 ? '#fff' : '#faf9fd',
                borderBottom: i < CHANNELS.length - 1 ? '1px solid rgba(66,44,118,0.07)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#414042', fontSize: '10px', fontWeight: 700 }}>{ch.channel}</div>
                    <div style={{ color: '#9a8fb5', fontSize: '8px', marginTop: '2px' }}>{ch.followers}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#00C07A', fontSize: '11px', fontWeight: 800 }}>{ch.growth}</div>
                    <div style={{ color: '#9a8fb5', fontSize: '8px' }}>{ch.posts} posts · {ch.engagement}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideBase>
  )
}
