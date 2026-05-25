'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { SlideBase } from '../SlideBase'
import type { SlideProps } from '../types'

const HC_DATA = [
  { name: 'Jan', VCI: 142, ARM: 208, TRP: 45 },
  { name: 'Fev', VCI: 145, ARM: 210, TRP: 47 },
  { name: 'Mar', VCI: 148, ARM: 215, TRP: 48 },
  { name: 'Abr', VCI: 151, ARM: 218, TRP: 50 },
  { name: 'Mai', VCI: 153, ARM: 220, TRP: 51 },
  { name: 'Jun', VCI: 155, ARM: 222, TRP: 52 },
  { name: 'Jul', VCI: 156, ARM: 224, TRP: 52 },
  { name: 'Ago', VCI: 158, ARM: 226, TRP: 53 },
  { name: 'Set', VCI: 160, ARM: 228, TRP: 54 },
  { name: 'Out', VCI: 162, ARM: 230, TRP: 55 },
  { name: 'Nov', VCI: 164, ARM: 232, TRP: 56 },
  { name: 'Dez', VCI: 165, ARM: 235, TRP: 58 },
]

const DEPT_DATA = [
  { dept: 'Operacional', plano: 240, real: 238, var: -0.8 },
  { dept: 'Administrativo', plano: 95, real: 96, var: +1.1 },
  { dept: 'Comercial', plano: 62, real: 60, var: -3.2 },
  { dept: 'TI & Projetos', plano: 38, real: 40, var: +5.3 },
  { dept: 'Liderança', plano: 28, real: 28, var: 0 },
  { dept: 'Estagiários', plano: 15, real: 18, var: +20.0 },
]

export function SlideHeadcount({ data, month }: SlideProps) {
  const monthName = data.monthly.find(m => m.month === month)?.name ?? ''
  const currentHc = HC_DATA.slice(0, month)
  const totalReal = DEPT_DATA.reduce((s, d) => s + d.real, 0)
  const totalPlano = DEPT_DATA.reduce((s, d) => s + d.plano, 0)

  return (
    <SlideBase
      title="Headcount"
      subtitle={`Recursos Humanos · ${monthName} ${data.year}`}
      contentBg="#f2f1f8"
    >
      <div style={{ padding: '10px 14px', height: '100%', display: 'flex', gap: '10px' }}>
        {/* Left: Evolution chart */}
        <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'HC Total', val: String(totalReal), color: '#2E2657' },
              { label: 'Plano', val: String(totalPlano), color: '#F23A5A' },
              { label: 'Variação', val: `${((totalReal - totalPlano) / totalPlano * 100).toFixed(1)}%`, color: totalReal <= totalPlano ? '#00E190' : '#f59e0b' },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '7px', padding: '8px 10px', borderLeft: `3px solid ${k.color}` }}>
                <div style={{ color: '#9a8fb5', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                <div style={{ color: '#2E2657', fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '10px 8px' }}>
            <div style={{ color: '#2E2657', fontSize: '9.5px', fontWeight: 700, paddingLeft: '6px', marginBottom: '4px' }}>
              Evolução HC — {data.year}
            </div>
            <ResponsiveContainer width="100%" height={265}>
              <BarChart data={currentHc} barCategoryGap="25%" barGap={1} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,44,118,0.07)" />
                <XAxis dataKey="name" tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7.5, fill: '#9a8fb5' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '9px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconSize={7} wrapperStyle={{ fontSize: '8px', paddingTop: '2px' }} />
                <Bar dataKey="VCI" fill="#422c76" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ARM" fill="#00E190" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="TRP" fill="#F23A5A" stackId="a" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Department breakdown */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#2E2657', padding: '8px 12px', color: '#fff', fontSize: '9.5px', fontWeight: 700 }}>
            Breakdown por Departamento
          </div>
          <div style={{ flex: 1, padding: '4px 0' }}>
            {DEPT_DATA.map((d, i) => {
              const pctVal = (d.real / totalReal) * 100
              const varColor = Math.abs(d.var) <= 2 ? '#00E190' : '#f59e0b'
              return (
                <div key={d.dept} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 12px',
                  background: i % 2 === 0 ? '#fff' : '#faf9fd',
                  borderBottom: '1px solid rgba(66,44,118,0.06)',
                }}>
                  <div style={{ width: '100px', color: '#414042', fontSize: '9.5px', fontWeight: 600 }}>{d.dept}</div>
                  <div style={{ flex: 1, height: '6px', background: '#f0eef8', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctVal * 2}%`, background: '#2E2657', borderRadius: '3px' }} />
                  </div>
                  <div style={{ minWidth: '28px', textAlign: 'right', color: '#2E2657', fontSize: '11px', fontWeight: 800 }}>{d.real}</div>
                  <div style={{ minWidth: '28px', textAlign: 'right', color: '#9a8fb5', fontSize: '9px' }}>{d.plano}</div>
                  <div style={{
                    minWidth: '38px', textAlign: 'right', fontSize: '9.5px', fontWeight: 700,
                    color: varColor,
                  }}>
                    {d.var >= 0 ? '+' : ''}{d.var.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '8px 12px', background: '#2E2657', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>Total HC</span>
            <span style={{ color: '#00E190', fontSize: '11px', fontWeight: 800 }}>{totalReal} colaboradores</span>
          </div>
        </div>
      </div>
    </SlideBase>
  )
}
