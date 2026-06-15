'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Save, CheckCircle2, AlertCircle, Building2 } from 'lucide-react'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CURRENT_MONTH = new Date().getMonth() + 1

export type ManualClient = {
  id: string
  nameReduced: string
  nameChart: string | null
  entity: string | null
  accountManager: string | null
  budgetEntries: { month: number; faturado: number | null; plan: number }[]
}

/** Formata valor para exibição dentro da célula de input */
function fmtInput(v: number): string {
  if (v === 0) return ''
  if (Math.abs(v) >= 1_000_000)
    return (v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M'
  if (Math.abs(v) >= 1_000)
    return Math.round(v / 1_000) + 'K'
  return String(Math.round(v))
}

/** Formata valor para a coluna Total e rodapé */
function fmtCurrency(v: number): string {
  if (v === 0) return '—'
  if (Math.abs(v) >= 1_000_000)
    return 'R$ ' + (v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M'
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/**
 * Converte string digitada pelo usuário em número (R$).
 * Aceita: "1,25M", "1.25M", "750K", "750k", "1250000", "1.250.000", "1,250,000"
 */
function parseNumber(s: string): number {
  if (!s.trim()) return 0
  const upper = s.trim().toUpperCase()
  if (upper.endsWith('M')) {
    const n = upper.slice(0, -1).replace(/\./g, '').replace(',', '.')
    return (parseFloat(n) || 0) * 1_000_000
  }
  if (upper.endsWith('K')) {
    const n = upper.slice(0, -1).replace(/\./g, '').replace(',', '.')
    return (parseFloat(n) || 0) * 1_000
  }
  // BRL: pontos como milhar, vírgula como decimal
  const n = upper.replace(/\./g, '').replace(',', '.')
  return parseFloat(n) || 0
}

type CellState = { value: string; original: number; saved: boolean; dirty: boolean }
type GridState  = Record<string, Record<number, CellState>>

function buildInitialState(clients: ManualClient[]): GridState {
  const state: GridState = {}
  for (const c of clients) {
    state[c.id] = {}
    for (let m = 1; m <= 12; m++) {
      const entry = c.budgetEntries.find(e => e.month === m)
      const v     = entry?.faturado ?? 0
      state[c.id][m] = { value: fmtInput(v), original: v, saved: false, dirty: false }
    }
  }
  return state
}

export function ManualFaturadoGrid({ clients }: { clients: ManualClient[] }) {
  const [grid,   setGrid]   = useState<GridState>(() => buildInitialState(clients))
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const handleChange = useCallback((clientId: string, month: number, value: string) => {
    setGrid(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [month]: { ...prev[clientId][month], value, dirty: true, saved: false },
      },
    }))
  }, [])

  const saveRow = useCallback(async (clientId: string) => {
    setSaving(prev => ({ ...prev, [clientId]: true }))

    const months: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) {
      const cell = grid[clientId][m]
      months[m] = cell.value ? parseNumber(cell.value) : 0
    }

    try {
      const res = await fetch('/api/forecast/faturado-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, months }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')

      setGrid(prev => {
        const updated = { ...prev[clientId] }
        for (const m in updated) {
          const raw = months[Number(m)]
          updated[m] = { ...updated[m], saved: true, dirty: false, original: raw, value: fmtInput(raw) }
        }
        return { ...prev, [clientId]: updated }
      })

      const name = clients.find(c => c.id === clientId)?.nameReduced ?? ''
      toast.success(`${name} salvo com sucesso`, {
        description: 'Faturado atualizado para todos os meses',
        icon: <CheckCircle2 className="h-4 w-4 text-green-400" />,
      })
    } catch {
      toast.error('Erro ao salvar', {
        description: 'Tente novamente em alguns instantes',
        icon: <AlertCircle className="h-4 w-4 text-red-400" />,
      })
    } finally {
      setSaving(prev => ({ ...prev, [clientId]: false }))
    }
  }, [grid, clients])

  const isDirty  = (cid: string) => Object.values(grid[cid] ?? {}).some(c => c.dirty)
  const rowTotal = (cid: string) => Object.values(grid[cid] ?? {}).reduce((sum, c) => sum + parseNumber(c.value), 0)

  const colTotals = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    return clients.reduce((sum, c) => sum + parseNumber(grid[c.id]?.[m]?.value ?? ''), 0)
  })
  const grandTotal = colTotals.reduce((a, b) => a + b, 0)

  const COL_TEMPLATE = '1fr 76px repeat(12, minmax(84px,1fr)) 110px 80px'

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-5 mb-3">
        {[
          { bg: 'rgba(66,44,118,0.08)',   border: 'rgba(66,44,118,0.2)',  label: 'Mês atual'       },
          { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(245,158,11,0.5)', label: 'Editado'          },
          { bg: 'rgba(1,225,142,0.12)',   border: 'rgba(1,193,122,0.4)',  label: 'Salvo'            },
        ].map(({ bg, border, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: '#6b6570' }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: bg, border: `1px solid ${border}` }} />
            {label}
          </div>
        ))}
      </div>

      <div
        className="w-full overflow-x-auto rounded-2xl"
        style={{ border: '1px solid rgba(66,44,118,0.1)', boxShadow: '0 2px 16px rgba(66,44,118,0.07)' }}
      >
        <div className="min-w-[1200px]">

          {/* Table header */}
          <div
            className="grid text-[11px] font-semibold uppercase tracking-wider"
            style={{
              gridTemplateColumns: COL_TEMPLATE,
              background: 'rgba(66,44,118,0.04)',
              borderBottom: '1px solid rgba(66,44,118,0.1)',
            }}
          >
            <div className="px-4 py-3" style={{ color: '#422c76' }}>Cliente</div>
            <div className="px-2 py-3 text-center" style={{ color: '#9a8fb5' }}>BU</div>
            {MONTHS.map((mo, i) => (
              <div
                key={mo}
                className="px-2 py-3 text-center"
                style={{ color: i + 1 === CURRENT_MONTH ? '#422c76' : '#9a8fb5' }}
              >
                {mo}
                {i + 1 === CURRENT_MONTH && (
                  <div
                    className="w-1 h-1 rounded-full mx-auto mt-0.5"
                    style={{ background: '#422c76' }}
                  />
                )}
              </div>
            ))}
            <div className="px-2 py-3 text-right" style={{ color: '#9a8fb5' }}>Total</div>
            <div className="px-2 py-3 text-center" style={{ color: '#9a8fb5' }}>Ação</div>
          </div>

          {/* Client rows */}
          {clients.map((client, idx) => {
            const dirty   = isDirty(client.id)
            const total   = rowTotal(client.id)
            const loading = saving[client.id]

            return (
              <div
                key={client.id}
                className="grid items-center transition-colors duration-150"
                style={{
                  gridTemplateColumns: COL_TEMPLATE,
                  borderBottom: '1px solid rgba(66,44,118,0.06)',
                  background: dirty
                    ? 'rgba(251,191,36,0.04)'
                    : idx % 2 === 0
                    ? '#ffffff'
                    : 'rgba(66,44,118,0.018)',
                }}
              >
                {/* Nome */}
                <div className="px-4 py-2.5 flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(66,44,118,0.08)' }}
                  >
                    <Building2 className="w-3.5 h-3.5" style={{ color: '#422c76' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#414042' }}>
                      {client.nameReduced}
                    </p>
                    {client.accountManager && (
                      <p className="text-xs truncate" style={{ color: '#9a8fb5' }}>
                        {client.accountManager}
                      </p>
                    )}
                  </div>
                </div>

                {/* BU */}
                <div className="px-2 py-2.5 text-center">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(66,44,118,0.08)', color: '#422c76' }}
                  >
                    {client.entity ?? '—'}
                  </span>
                </div>

                {/* Month cells */}
                {Array.from({ length: 12 }, (_, i) => {
                  const m         = i + 1
                  const cell      = grid[client.id]?.[m]
                  const isCurrent = m === CURRENT_MONTH

                  const borderColor =
                    cell?.dirty ? 'rgba(245,158,11,0.6)' :
                    cell?.saved ? 'rgba(1,193,122,0.5)'  :
                    isCurrent   ? 'rgba(66,44,118,0.28)' :
                                  'rgba(66,44,118,0.1)'

                  const bgColor =
                    cell?.dirty ? 'rgba(251,191,36,0.08)' :
                    cell?.saved ? 'rgba(1,225,142,0.08)'  :
                    isCurrent   ? 'rgba(66,44,118,0.04)'  :
                                  'transparent'

                  const textColor =
                    cell?.dirty ? '#92400e' :
                    cell?.saved ? '#065f46' :
                                  '#414042'

                  return (
                    <div key={m} className="px-1 py-1.5">
                      <input
                        type="text"
                        value={cell?.value ?? ''}
                        onChange={e => handleChange(client.id, m, e.target.value)}
                        placeholder=""
                        className="w-full text-right text-xs px-2 py-1.5 rounded-lg font-medium transition-all duration-150"
                        style={{
                          border: `1px solid ${borderColor}`,
                          background: bgColor,
                          color: textColor,
                          outline: 'none',
                        }}
                        onFocus={e => {
                          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(66,44,118,0.15)'
                        }}
                        onBlur={e => {
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                  )
                })}

                {/* Row total */}
                <div className="px-2 py-2.5 text-right">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: total > 0 ? '#414042' : '#d4cfe3' }}
                  >
                    {fmtCurrency(total)}
                  </span>
                </div>

                {/* Save button */}
                <div className="px-2 py-2.5 flex justify-center">
                  <button
                    onClick={() => saveRow(client.id)}
                    disabled={!dirty || loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{
                      background:  dirty && !loading ? '#422c76' : 'rgba(66,44,118,0.06)',
                      color:       dirty && !loading ? '#ffffff'  : '#c4bdd9',
                      cursor:      dirty && !loading ? 'pointer'  : 'not-allowed',
                      boxShadow:   dirty && !loading ? '0 2px 8px rgba(66,44,118,0.28)' : 'none',
                    }}
                  >
                    {loading ? (
                      <span
                        className="h-3 w-3 rounded-full border-2 animate-spin"
                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                      />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    {loading ? 'Salvando' : 'Salvar'}
                  </button>
                </div>
              </div>
            )
          })}

          {/* Totals row */}
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: COL_TEMPLATE,
              background: 'rgba(66,44,118,0.04)',
              borderTop: '2px solid rgba(66,44,118,0.14)',
            }}
          >
            <div
              className="px-4 py-3 text-xs font-bold uppercase tracking-wider"
              style={{ color: '#422c76' }}
            >
              Total
            </div>
            <div />
            {colTotals.map((v, i) => (
              <div
                key={i}
                className="px-2 py-3 text-right text-xs font-semibold"
                style={{ color: i + 1 === CURRENT_MONTH ? '#422c76' : '#6b6570' }}
              >
                {fmtCurrency(v)}
              </div>
            ))}
            <div className="px-2 py-3 text-right text-sm font-bold" style={{ color: '#422c76' }}>
              {fmtCurrency(grandTotal)}
            </div>
            <div />
          </div>

        </div>
      </div>

      <p className="mt-3 text-xs px-0.5" style={{ color: '#9a8fb5' }}>
        Use{' '}
        <strong style={{ color: '#6b6570' }}>1,25M</strong> → R$ 1.250.000 &nbsp;|&nbsp;{' '}
        <strong style={{ color: '#6b6570' }}>750K</strong> → R$ 750.000 &nbsp;|&nbsp;{' '}
        Números sem sufixo são tratados como R$ exatos.
      </p>
    </div>
  )
}

export function ManualClientsInfo({ clients }: { clients: ManualClient[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {clients.map(c => (
        <div
          key={c.id}
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: '#fff',
            border: '1px solid rgba(66,44,118,0.1)',
            boxShadow: '0 1px 4px rgba(66,44,118,0.06)',
          }}
        >
          <div
            className="w-1.5 h-5 rounded-full flex-shrink-0"
            style={{ background: '#422c76' }}
          />
          <div>
            <p className="text-xs font-semibold leading-tight" style={{ color: '#414042' }}>
              {c.nameReduced}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: '#9a8fb5' }}>
              {c.entity}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
