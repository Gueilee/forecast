'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronRight, ChevronDown, Search } from 'lucide-react'
import { cn, MONTH_SHORT } from '@/lib/utils'

export type MonthData = {
  plan: number
  fc: number | null
  faturado: number
  orders: number | null
  withoutOrders: number | null
  weeks: Record<number, number>
}

export type MatrixRow = {
  id: string
  sortOrder: number
  nameReduced: string
  accountManager: string | null
  entity: string | null
  modality: string | null
  commercialType: string | null
  pl4Bu: string | null
  months: Record<number, MonthData>
}

type Props = {
  rows: MatrixRow[]
  year: number
  currentMonth: number
}

// Brand colors
const LILAS = '#422c76'
const MAGENTA = '#ff2f69'
const VERDE = '#01E18E'
const GRAFITE = '#414042'
const OFFWHITE = '#faf9f5'

function fmt(v: number): string {
  if (v === 0) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${Math.round(v / 1_000)}K`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function desvPct(plan: number, actual: number): number | null {
  if (plan === 0) return null
  return ((actual - plan) / plan) * 100
}

function pctStyle(pct: number | null, hasFat: boolean): { color: string; fontWeight?: number } {
  if (pct === null || !hasFat) return { color: 'rgba(65,64,66,0.2)' }
  if (pct >= -5) return { color: '#00b870', fontWeight: 700 }
  if (pct >= -20) return { color: '#d97706', fontWeight: 700 }
  return { color: MAGENTA, fontWeight: 700 }
}

function pctBg(pct: number | null, hasFat: boolean): string {
  if (pct === null || !hasFat) return ''
  if (pct >= -5) return 'rgba(1,225,142,0.08)'
  if (pct >= -20) return 'rgba(245,158,11,0.08)'
  return 'rgba(255,47,105,0.08)'
}

// Column widths
const CW = { name: 168, am: 90, entity: 64, tipo: 72 } as const
const LEFT_W = CW.name + CW.am + CW.entity + CW.tipo
const MONTH_W = 90
const EXP_W = [72, 72, 72, 60] as const

// BU badge colors
const BU_COLOR: Record<string, { color: string; bg: string }> = {
  'VCI':       { color: LILAS,    bg: 'rgba(66,44,118,0.1)' },
  'ARM - GRV': { color: MAGENTA,  bg: 'rgba(255,47,105,0.1)' },
  'ARM - ITV': { color: '#00b870',bg: 'rgba(1,225,142,0.1)' },
  'ARM - NVG': { color: '#d97706',bg: 'rgba(245,158,11,0.1)' },
  'TRP':       { color: GRAFITE,  bg: 'rgba(65,64,66,0.08)' },
}

const MONTHS_ARRAY = Array.from({ length: 12 }, (_, i) => i + 1)

const HEADER_BG = LILAS
const HEADER_CURR_BG = '#ff2f69'

export function ForecastMatrix({ rows, year, currentMonth }: Props) {
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(
    () => new Set([currentMonth])
  )
  const [search, setSearch] = useState('')
  const [filterEntity, setFilterEntity] = useState('all')
  const [filterAM, setFilterAM] = useState('all')

  const toggleMonth = useCallback((m: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m); else next.add(m)
      return next
    })
  }, [])

  const entities = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.entity) s.add(r.entity)
    return Array.from(s).sort()
  }, [rows])

  const accountManagers = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.accountManager) s.add(r.accountManager)
    return Array.from(s).sort()
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => {
      if (filterEntity !== 'all' && r.entity !== filterEntity) return false
      if (filterAM !== 'all' && r.accountManager !== filterAM) return false
      if (q && !r.nameReduced.toLowerCase().includes(q) &&
              !r.accountManager?.toLowerCase().includes(q) &&
              !r.entity?.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, filterEntity, filterAM])

  const totals = useMemo(() => {
    const t: Record<number, { plan: number; fc: number; faturado: number }> = {}
    for (let m = 1; m <= 12; m++) t[m] = { plan: 0, fc: 0, faturado: 0 }
    for (const row of filtered) {
      for (let m = 1; m <= 12; m++) {
        const md = row.months[m]
        if (!md) continue
        t[m].plan += md.plan
        t[m].fc += md.fc ?? md.plan
        t[m].faturado += md.faturado
      }
    }
    return t
  }, [filtered])

  const annualPlanTotal = useMemo(
    () => Object.values(totals).reduce((a, t) => a + t.plan, 0),
    [totals]
  )

  const tableMinWidth =
    LEFT_W +
    MONTHS_ARRAY.reduce((a, m) =>
      a + (expandedMonths.has(m) ? EXP_W.reduce((s, w) => s + w, 0) : MONTH_W), 0
    ) + MONTH_W

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: OFFWHITE }}>

      {/* Filter bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid rgba(66,44,118,0.1)',
          boxShadow: '0 1px 8px rgba(66,44,118,0.05)',
        }}
      >
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: '#9a8fb5' }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, AM ou BU..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl w-56 focus:outline-none focus:ring-2 transition-all"
            style={{
              background: OFFWHITE,
              border: '1.5px solid rgba(66,44,118,0.15)',
              color: GRAFITE,
            }}
          />
        </div>

        <select
          value={filterEntity}
          onChange={e => setFilterEntity(e.target.value)}
          className="text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2"
          style={{
            background: OFFWHITE,
            border: '1.5px solid rgba(66,44,118,0.15)',
            color: GRAFITE,
          }}
        >
          <option value="all">Todas as BUs</option>
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <select
          value={filterAM}
          onChange={e => setFilterAM(e.target.value)}
          className="text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2"
          style={{
            background: OFFWHITE,
            border: '1.5px solid rgba(66,44,118,0.15)',
            color: GRAFITE,
          }}
        >
          <option value="all">Todos os Account Managers</option>
          {accountManagers.map(am => <option key={am} value={am}>{am}</option>)}
        </select>

        <span className="ml-auto text-xs tabular-nums font-medium" style={{ color: '#9a8fb5' }}>
          {filtered.length} de {rows.length} linhas · {year}
        </span>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto">
        <table
          className="border-collapse text-xs"
          style={{ tableLayout: 'fixed', minWidth: `${tableMinWidth}px`, width: '100%' }}
        >
          <colgroup>
            <col style={{ width: `${CW.name}px` }} />
            <col style={{ width: `${CW.am}px` }} />
            <col style={{ width: `${CW.entity}px` }} />
            <col style={{ width: `${CW.tipo}px` }} />
            {MONTHS_ARRAY.flatMap(m =>
              expandedMonths.has(m)
                ? EXP_W.map((w, i) => <col key={`${m}-${i}`} style={{ width: `${w}px` }} />)
                : [<col key={m} style={{ width: `${MONTH_W}px` }} />]
            )}
            <col style={{ width: `${MONTH_W}px` }} />
          </colgroup>

          <thead className="sticky top-0 z-20">
            {/* Group header row */}
            <tr>
              <th
                colSpan={4}
                className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest sticky left-0 z-30"
                style={{
                  background: LILAS,
                  color: 'rgba(255,255,255,0.5)',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Cliente / Dimensões
              </th>
              {MONTHS_ARRAY.flatMap(m => {
                const isExp = expandedMonths.has(m)
                const isCurr = m === currentMonth
                const span = isExp ? EXP_W.length : 1
                return [
                  <th
                    key={m}
                    colSpan={span}
                    onClick={() => toggleMonth(m)}
                    className="text-center py-2.5 px-1 text-[11px] font-bold cursor-pointer select-none transition-opacity"
                    title={isExp ? 'Colapsar' : 'Expandir'}
                    style={{
                      background: isCurr ? HEADER_CURR_BG : HEADER_BG,
                      color: isCurr ? '#fff' : 'rgba(255,255,255,0.75)',
                      borderLeft: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className="flex items-center justify-center gap-0.5">
                      {MONTH_SHORT[m - 1]}
                      {isCurr && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full ml-0.5 flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.9)' }}
                        />
                      )}
                      {isExp
                        ? <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />
                        : <ChevronRight className="w-3 h-3 opacity-40 flex-shrink-0" />
                      }
                    </span>
                  </th>
                ]
              })}
              <th
                className="text-center py-2.5 px-2 text-[11px] font-bold"
                style={{
                  background: '#2d1d5c',
                  color: 'rgba(255,255,255,0.5)',
                  borderLeft: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Anual
              </th>
            </tr>

            {/* Sub-column labels */}
            <tr style={{ borderBottom: '2px solid rgba(66,44,118,0.15)', background: '#f3f0f9' }}>
              <th
                className="text-left px-2 py-2 text-[11px] font-bold sticky z-30 border-r"
                style={{
                  left: 0,
                  background: '#f3f0f9',
                  color: LILAS,
                  borderColor: 'rgba(66,44,118,0.12)',
                }}
              >
                Cliente
              </th>
              <th
                className="text-left px-2 py-2 text-[11px] font-semibold sticky z-30 border-r truncate"
                style={{
                  left: `${CW.name}px`,
                  background: '#f3f0f9',
                  color: '#6b6570',
                  borderColor: 'rgba(66,44,118,0.1)',
                }}
              >
                AM
              </th>
              <th
                className="text-left px-2 py-2 text-[11px] font-semibold sticky z-30 border-r"
                style={{
                  left: `${CW.name + CW.am}px`,
                  background: '#f3f0f9',
                  color: '#6b6570',
                  borderColor: 'rgba(66,44,118,0.1)',
                }}
              >
                BU
              </th>
              <th
                className="text-left px-2 py-2 text-[11px] font-semibold sticky z-30 border-r"
                style={{
                  left: `${CW.name + CW.am + CW.entity}px`,
                  background: '#f3f0f9',
                  color: '#6b6570',
                  borderColor: 'rgba(66,44,118,0.15)',
                }}
              >
                Tipo
              </th>
              {MONTHS_ARRAY.flatMap(m => {
                if (expandedMonths.has(m)) {
                  return [
                    <th key={`${m}-hp`} className="text-right px-2 py-2 text-[10px] font-bold uppercase tracking-wide border-l" style={{ color: '#9a8fb5', borderColor: 'rgba(66,44,118,0.1)' }}>Plano</th>,
                    <th key={`${m}-hf`} className="text-right px-2 py-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9a8fb5' }}>FC</th>,
                    <th key={`${m}-hr`} className="text-right px-2 py-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9a8fb5' }}>Real.</th>,
                    <th key={`${m}-hd`} className="text-center px-1 py-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9a8fb5' }}>Δ%</th>,
                  ]
                }
                return [
                  <th key={m} className="text-right px-2 py-2 text-[10px] font-bold uppercase tracking-wide border-l" style={{ color: '#9a8fb5', borderColor: 'rgba(66,44,118,0.1)' }}>Plano</th>
                ]
              })}
              <th className="text-right px-2 py-2 text-[10px] font-bold uppercase tracking-wide border-l" style={{ color: '#9a8fb5', borderColor: 'rgba(66,44,118,0.15)' }}>Plano</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((row, idx) => {
              const annualPlan = MONTHS_ARRAY.reduce((a, m) => a + (row.months[m]?.plan ?? 0), 0)
              const buCfg = BU_COLOR[row.entity ?? ''] ?? { color: LILAS, bg: 'rgba(66,44,118,0.08)' }
              const isEven = idx % 2 === 0
              const rowBg = isEven ? '#ffffff' : OFFWHITE

              return (
                <tr
                  key={row.id}
                  className="group transition-colors"
                  style={{ borderBottom: '1px solid rgba(66,44,118,0.06)' }}
                  onMouseEnter={e => {
                    const tds = e.currentTarget.querySelectorAll('td')
                    tds.forEach(td => (td.style.background = 'rgba(66,44,118,0.04)'))
                  }}
                  onMouseLeave={e => {
                    const tds = e.currentTarget.querySelectorAll<HTMLTableCellElement>('td')
                    tds.forEach((td, i) => {
                      if (i < 4) td.style.background = rowBg
                      else td.style.background = ''
                    })
                  }}
                >
                  {/* Sticky left: Cliente */}
                  <td
                    className="px-2 py-2 sticky z-10 font-semibold truncate text-[11px]"
                    style={{ left: 0, background: rowBg, color: GRAFITE, borderRight: '1px solid rgba(66,44,118,0.06)' }}
                    title={row.nameReduced}
                  >
                    {row.nameReduced}
                  </td>
                  {/* AM */}
                  <td
                    className="px-2 py-2 sticky z-10 truncate text-[11px]"
                    style={{ left: `${CW.name}px`, background: rowBg, color: '#6b6570' }}
                    title={row.accountManager ?? ''}
                  >
                    {row.accountManager ?? '—'}
                  </td>
                  {/* BU */}
                  <td
                    className="px-2 py-2 sticky z-10 text-[11px]"
                    style={{ left: `${CW.name + CW.am}px`, background: rowBg }}
                  >
                    {row.entity ? (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold truncate max-w-full"
                        style={{ background: buCfg.bg, color: buCfg.color }}
                      >
                        {row.entity.replace('ARM - ', '')}
                      </span>
                    ) : '—'}
                  </td>
                  {/* Tipo */}
                  <td
                    className="px-2 py-2 sticky z-10 truncate text-[10px]"
                    style={{
                      left: `${CW.name + CW.am + CW.entity}px`,
                      background: rowBg,
                      color: '#9a8fb5',
                      borderRight: '1px solid rgba(66,44,118,0.1)',
                    }}
                  >
                    {row.commercialType ?? '—'}
                  </td>

                  {/* Month cells */}
                  {MONTHS_ARRAY.flatMap(m => {
                    const md = row.months[m]
                    const plan = md?.plan ?? 0
                    const fc = md?.fc ?? null
                    const faturado = md?.faturado ?? 0
                    const pct = desvPct(plan, faturado)
                    const hasFat = faturado > 0

                    if (expandedMonths.has(m)) {
                      const ps = pctStyle(pct, hasFat)
                      return [
                        <td key={`${m}-plan`} className="px-2 py-2 text-right tabular-nums text-[11px]" style={{ color: plan > 0 ? GRAFITE : 'rgba(65,64,66,0.2)', borderLeft: '1px solid rgba(66,44,118,0.06)' }}>
                          {plan > 0 ? fmt(plan) : '—'}
                        </td>,
                        <td key={`${m}-fc`} className="px-2 py-2 text-right tabular-nums text-[11px]" style={{ color: '#9a8fb5' }}>
                          {fc != null ? fmt(fc) : plan > 0 ? fmt(plan) : '—'}
                        </td>,
                        <td key={`${m}-real`} className="px-2 py-2 text-right tabular-nums text-[11px] font-semibold" style={{ color: hasFat ? '#00b870' : 'rgba(65,64,66,0.15)' }}>
                          {hasFat ? fmt(faturado) : '—'}
                        </td>,
                        <td
                          key={`${m}-desv`}
                          className="px-1 py-2 text-center tabular-nums text-[10px] rounded-sm"
                          style={{
                            ...ps,
                            background: hasFat ? pctBg(pct, hasFat) : 'transparent',
                          }}
                        >
                          {hasFat && pct !== null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                        </td>,
                      ]
                    }

                    return [
                      <td
                        key={m}
                        className="px-2 py-2 text-right tabular-nums text-[11px]"
                        style={{
                          color: plan > 0 ? GRAFITE : 'rgba(65,64,66,0.18)',
                          borderLeft: '1px solid rgba(66,44,118,0.05)',
                        }}
                      >
                        {plan > 0 ? fmt(plan) : '—'}
                      </td>
                    ]
                  })}

                  {/* Annual total */}
                  <td
                    className="px-2 py-2 text-right tabular-nums font-bold text-[11px]"
                    style={{
                      color: LILAS,
                      borderLeft: '2px solid rgba(66,44,118,0.15)',
                    }}
                  >
                    {annualPlan > 0 ? fmt(annualPlan) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Totals row */}
          <tfoot>
            <tr style={{ background: LILAS, borderTop: `2px solid ${LILAS}` }}>
              <td
                colSpan={4}
                className="px-3 py-2.5 text-[11px] font-bold sticky left-0 z-10 uppercase tracking-wide"
                style={{ background: LILAS, color: 'rgba(255,255,255,0.7)' }}
              >
                TOTAL — {filtered.length} {filtered.length === 1 ? 'linha' : 'linhas'}
              </td>
              {MONTHS_ARRAY.flatMap(m => {
                const t = totals[m]
                const pct = desvPct(t.plan, t.faturado)
                const hasFat = t.faturado > 0

                if (expandedMonths.has(m)) {
                  const pctColor = hasFat && pct !== null
                    ? (pct >= -5 ? VERDE : pct >= -20 ? '#f59e0b' : '#ff8aaa')
                    : 'rgba(255,255,255,0.25)'
                  return [
                    <td key={`${m}-p`} className="px-2 py-2.5 text-right tabular-nums font-bold text-[11px] text-white" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>{fmt(t.plan)}</td>,
                    <td key={`${m}-f`} className="px-2 py-2.5 text-right tabular-nums text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.fc > 0 ? fmt(t.fc) : '—'}</td>,
                    <td key={`${m}-r`} className="px-2 py-2.5 text-right tabular-nums font-bold text-[11px]" style={{ color: hasFat ? VERDE : 'rgba(255,255,255,0.2)' }}>{hasFat ? fmt(t.faturado) : '—'}</td>,
                    <td key={`${m}-d`} className="px-1 py-2.5 text-center tabular-nums text-[10px] font-bold" style={{ color: pctColor }}>
                      {hasFat && pct !== null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                    </td>,
                  ]
                }
                return [
                  <td key={m} className="px-2 py-2.5 text-right tabular-nums font-bold text-white text-[11px]" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                    {fmt(t.plan)}
                  </td>
                ]
              })}
              <td
                className="px-2 py-2.5 text-right tabular-nums font-extrabold text-[12px]"
                style={{ color: '#ffffff', borderLeft: '2px solid rgba(255,255,255,0.2)' }}
              >
                {fmt(annualPlanTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
