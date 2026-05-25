'use client'

import { SlideBase, fmt } from '../SlideBase'
import type { SlideProps } from '../types'

const EXPENSES = [
  { category: 'Pessoal & Benefícios', budget: 4_200_000, actual: 4_150_000, ytdBudget: 21_000_000, ytdActual: 20_800_000 },
  { category: 'Tecnologia & TI', budget: 380_000, actual: 395_000, ytdBudget: 1_900_000, ytdActual: 1_950_000 },
  { category: 'Infraestrutura', budget: 520_000, actual: 498_000, ytdBudget: 2_600_000, ytdActual: 2_540_000 },
  { category: 'Marketing & Comercial', budget: 280_000, actual: 265_000, ytdBudget: 1_400_000, ytdActual: 1_380_000 },
  { category: 'Viagens & Representação', budget: 120_000, actual: 108_000, ytdBudget: 600_000, ytdActual: 545_000 },
  { category: 'Jurídico & Compliance', budget: 95_000, actual: 102_000, ytdBudget: 475_000, ytdActual: 498_000 },
  { category: 'Outros Administrativos', budget: 185_000, actual: 172_000, ytdBudget: 925_000, ytdActual: 870_000 },
]

function DesvioChip({ budget, actual }: { budget: number; actual: number }) {
  const d = budget > 0 ? ((actual - budget) / budget) * 100 : 0
  const color = d <= 0 ? '#00C07A' : d <= 5 ? '#f59e0b' : '#F23A5A'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: '4px',
      background: `${color}18`, color, fontWeight: 700, fontSize: '9px',
    }}>
      {d <= 0 ? '' : '+'}{d.toFixed(1)}%
    </span>
  )
}

export function SlideCorporateExpenses({ data, month }: SlideProps) {
  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''
  const totalBudget = EXPENSES.reduce((s, e) => s + e.budget, 0)
  const totalActual = EXPENSES.reduce((s, e) => s + e.actual, 0)
  const totalYtdBudget = EXPENSES.reduce((s, e) => s + e.ytdBudget, 0)
  const totalYtdActual = EXPENSES.reduce((s, e) => s + e.ytdActual, 0)
  const savings = totalYtdBudget - totalYtdActual

  return (
    <SlideBase
      title="Despesas Corporativas"
      subtitle={`Controle de Custos · ${monthName} ${data.year}`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Summary KPIs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Orçado Mês', val: fmt(totalBudget), color: '#2E2657' },
            { label: 'Realizado Mês', val: fmt(totalActual), color: totalActual <= totalBudget ? '#00E190' : '#F23A5A' },
            { label: 'Orçado YTD', val: fmt(totalYtdBudget), color: '#2E2657' },
            { label: 'Realizado YTD', val: fmt(totalYtdActual), color: totalYtdActual <= totalYtdBudget ? '#00E190' : '#F23A5A' },
            { label: 'Economia YTD', val: fmt(Math.abs(savings)), color: savings >= 0 ? '#00E190' : '#F23A5A' },
          ].map(k => (
            <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '7px', padding: '8px 10px', borderLeft: `3px solid ${k.color}` }}>
              <div style={{ color: '#9a8fb5', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
              <div style={{ color: '#2E2657', fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Expenses table */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#2E2657' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', fontWeight: 700 }}>Categoria</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Orçado Mês</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Real. Mês</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Desvio</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Orçado YTD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Real. YTD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>Var. YTD</th>
              </tr>
            </thead>
            <tbody>
              {EXPENSES.map((e, i) => (
                <tr key={e.category} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fd', borderBottom: '1px solid rgba(66,44,118,0.05)' }}>
                  <td style={{ padding: '7px 12px', color: '#414042', fontWeight: 600, fontSize: '9.5px' }}>{e.category}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#9a8fb5', fontSize: '9.5px' }}>{fmt(e.budget)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#2E2657', fontWeight: 700, fontSize: '9.5px' }}>{fmt(e.actual)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}><DesvioChip budget={e.budget} actual={e.actual} /></td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#9a8fb5', fontSize: '9.5px' }}>{fmt(e.ytdBudget)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#2E2657', fontWeight: 700, fontSize: '9.5px' }}>{fmt(e.ytdActual)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}><DesvioChip budget={e.ytdBudget} actual={e.ytdActual} /></td>
                </tr>
              ))}
              <tr style={{ background: '#2E2657' }}>
                <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 800 }}>TOTAL</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>{fmt(totalBudget)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#00E190', fontWeight: 800 }}>{fmt(totalActual)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}><DesvioChip budget={totalBudget} actual={totalActual} /></td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontWeight: 700 }}>{fmt(totalYtdBudget)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#00E190', fontWeight: 800 }}>{fmt(totalYtdActual)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}><DesvioChip budget={totalYtdBudget} actual={totalYtdActual} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SlideBase>
  )
}
