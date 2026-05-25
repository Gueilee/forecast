'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { SlideBase, fmt } from '../SlideBase'
import type { SlideProps } from '../types'

const CF_CATEGORIES = [
  { label: 'Recebimentos de Clientes', type: 'entrada', values: [18.2, 21.4, 19.8, 22.1, 20.5, 23.4] },
  { label: 'Pagamentos Fornecedores', type: 'saida', values: [-8.4, -9.2, -8.8, -9.6, -8.9, -10.1] },
  { label: 'Folha de Pagamento', type: 'saida', values: [-5.8, -5.9, -5.8, -5.9, -6.0, -6.0] },
  { label: 'Impostos e Tributos', type: 'saida', values: [-2.1, -2.4, -2.2, -2.5, -2.3, -2.6] },
  { label: 'Investimentos (CAPEX)', type: 'saida', values: [-0.8, -1.2, -0.5, -1.5, -0.6, -0.9] },
  { label: 'Financiamentos', type: 'saida', values: [-0.4, -0.4, -0.4, -0.4, -0.4, -0.4] },
]

export function SlideCashFlow({ data, month }: SlideProps) {
  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''
  const maxMonths = Math.min(month, 6)
  const monthLabels = data.monthly.slice(0, maxMonths).map(m => m.short)

  const chartData = monthLabels.map((name, i) => {
    const entradas = CF_CATEGORIES.filter(c => c.type === 'entrada').reduce((s, c) => s + (c.values[i] ?? 0), 0)
    const saidas = Math.abs(CF_CATEGORIES.filter(c => c.type === 'saida').reduce((s, c) => s + (c.values[i] ?? 0), 0))
    const saldo = entradas - saidas
    return { name, Entradas: Math.round(entradas * 10) / 10, Saídas: -Math.round(saidas * 10) / 10, Saldo: Math.round(saldo * 10) / 10 }
  })

  const totalEntradas = CF_CATEGORIES.filter(c => c.type === 'entrada').reduce((s, c) => s + c.values.slice(0, maxMonths).reduce((a, b) => a + b, 0), 0)
  const totalSaidas = Math.abs(CF_CATEGORIES.filter(c => c.type === 'saida').reduce((s, c) => s + c.values.slice(0, maxMonths).reduce((a, b) => a + b, 0), 0))
  const saldoFinal = totalEntradas - totalSaidas

  return (
    <SlideBase
      title="Fluxo de Caixa"
      subtitle={`Financeiro · YTD até ${monthName} ${data.year}`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', gap: '10px' }}>
        {/* Left: Chart */}
        <div style={{ flex: '0 0 52%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'Total Entradas', val: `R$ ${totalEntradas.toFixed(1)}M`, color: '#00E190' },
              { label: 'Total Saídas', val: `R$ ${totalSaidas.toFixed(1)}M`, color: '#F23A5A' },
              { label: 'Saldo Acumulado', val: `R$ ${saldoFinal.toFixed(1)}M`, color: saldoFinal >= 0 ? '#00E190' : '#F23A5A' },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '7px', padding: '8px 10px', borderLeft: `3px solid ${k.color}` }}>
                <div style={{ color: '#9a8fb5', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                <div style={{ color: '#2E2657', fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '10px 8px' }}>
            <div style={{ color: '#2E2657', fontSize: '9.5px', fontWeight: 700, paddingLeft: '6px', marginBottom: '4px' }}>
              Fluxo Mensal (R$ M)
            </div>
            <ResponsiveContainer width="100%" height={265}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,44,118,0.07)" />
                <XAxis dataKey="name" tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '9px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(v) => typeof v === 'number' ? [`R$ ${v}M`, ''] : ['—', '']} />
                <Legend iconSize={7} wrapperStyle={{ fontSize: '8px', paddingTop: '2px' }} />
                <Bar dataKey="Entradas" fill="#00E190" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Saídas" fill="rgba(242,58,90,0.7)" radius={[2, 2, 0, 0]} />
                <Line dataKey="Saldo" stroke="#2E2657" strokeWidth={2} dot={{ r: 3, fill: '#2E2657' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Breakdown table */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#2E2657', padding: '8px 12px', color: '#fff', fontSize: '9.5px', fontWeight: 700 }}>
            Categorias de Fluxo — YTD
          </div>
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(46,38,87,0.06)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#2E2657', fontWeight: 700 }}>Categoria</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#2E2657', fontWeight: 700 }}>Tipo</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#2E2657', fontWeight: 700 }}>Total YTD</th>
                </tr>
              </thead>
              <tbody>
                {CF_CATEGORIES.map((cat, i) => {
                  const total = cat.values.slice(0, maxMonths).reduce((a, b) => a + b, 0)
                  const isEntrada = cat.type === 'entrada'
                  return (
                    <tr key={cat.label} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fd', borderBottom: '1px solid rgba(66,44,118,0.05)' }}>
                      <td style={{ padding: '6px 10px', color: '#414042', fontWeight: 600, fontSize: '9px' }}>{cat.label}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 7px', borderRadius: '4px',
                          background: isEntrada ? '#00E19018' : '#F23A5A18',
                          color: isEntrada ? '#00A066' : '#c01040',
                          fontWeight: 700, fontSize: '8px',
                        }}>
                          {isEntrada ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: isEntrada ? '#00A066' : '#c01040', fontWeight: 700 }}>
                        {isEntrada ? '' : ''}{total > 0 ? '+' : ''}R$ {total.toFixed(1)}M
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{
            padding: '8px 12px', background: '#2E2657',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>Saldo Final YTD</span>
            <span style={{ color: saldoFinal >= 0 ? '#00E190' : '#F23A5A', fontSize: '12px', fontWeight: 800 }}>
              R$ {saldoFinal.toFixed(1)}M
            </span>
          </div>
        </div>
      </div>
    </SlideBase>
  )
}
