'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Save, CheckCircle2, AlertCircle, PencilLine, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function fmtCurrency(v: number) {
  if (v === 0) return ''
  if (Math.abs(v) >= 1_000_000)
    return 'R$' + (v / 1_000_000).toFixed(2).replace('.', ',') + 'M'
  return 'R$' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function parseNumber(s: string): number {
  const clean = s.replace(/[R$M\s]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  if (isNaN(n)) return 0
  // Se digitou algo como "1.5M" → 1500000
  if (s.includes('M') || s.includes('m')) return n * 1_000_000
  return n
}

type CellState = {
  value: string       // valor exibido no input
  original: number    // valor original ao abrir
  saved: boolean      // foi salvo com sucesso
  dirty: boolean      // foi editado
}

type GridState = Record<string, Record<number, CellState>> // clientId → month → CellState

function buildInitialState(clients: ManualClient[]): GridState {
  const state: GridState = {}
  for (const c of clients) {
    state[c.id] = {}
    for (let m = 1; m <= 12; m++) {
      const entry = c.budgetEntries.find(e => e.month === m)
      const v     = entry?.faturado ?? 0
      state[c.id][m] = { value: v === 0 ? '' : (v / 1_000_000).toFixed(3).replace('.', ','), original: v, saved: false, dirty: false }
    }
  }
  return state
}

export function ManualFaturadoGrid({ clients }: { clients: ManualClient[] }) {
  const [grid,    setGrid]    = useState<GridState>(() => buildInitialState(clients))
  const [saving,  setSaving]  = useState<Record<string, boolean>>({})

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
          updated[m] = { ...updated[m], saved: true, dirty: false, original: months[Number(m)] }
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

  const isDirty = (clientId: string) =>
    Object.values(grid[clientId] ?? {}).some(c => c.dirty)

  const rowTotal = (clientId: string) =>
    Object.values(grid[clientId] ?? {}).reduce((sum, c) => sum + (c.value ? parseNumber(c.value) : 0), 0)

  // Totais por coluna (mês)
  const colTotals = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    return clients.reduce((sum, c) => {
      const cell = grid[c.id]?.[m]
      return sum + (cell?.value ? parseNumber(cell.value) : 0)
    }, 0)
  })

  const grandTotal = colTotals.reduce((a, b) => a + b, 0)

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1200px]">

        {/* ── Legenda ── */}
        <div className="flex items-center gap-4 mb-4 px-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <div className="w-3 h-3 rounded-sm bg-violet-500/20 border border-violet-500/40" />
            Mês atual
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <div className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/40" />
            Editado (não salvo)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
            Salvo
          </div>
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden shadow-lg">
          {/* ── Header da tabela ── */}
          <div
            className="grid text-xs font-semibold text-zinc-300 uppercase tracking-wider bg-zinc-900/80"
            style={{ gridTemplateColumns: '1fr 80px repeat(12, minmax(90px,1fr)) 110px 80px' }}
          >
            <div className="px-4 py-3">Cliente</div>
            <div className="px-2 py-3 text-center">BU</div>
            {MONTHS.map((mo, i) => (
              <div
                key={mo}
                className={cn(
                  'px-2 py-3 text-center',
                  i + 1 === CURRENT_MONTH && 'text-violet-400'
                )}
              >
                {mo}
              </div>
            ))}
            <div className="px-2 py-3 text-right">Total</div>
            <div className="px-2 py-3 text-center">Ação</div>
          </div>

          {/* ── Linhas de clientes ── */}
          {clients.map((client, idx) => {
            const dirty   = isDirty(client.id)
            const total   = rowTotal(client.id)
            const loading = saving[client.id]

            return (
              <div
                key={client.id}
                className={cn(
                  'grid items-center border-t border-white/5 transition-colors duration-150',
                  idx % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-900/10',
                  dirty && 'bg-amber-950/20'
                )}
                style={{ gridTemplateColumns: '1fr 80px repeat(12, minmax(90px,1fr)) 110px 80px' }}
              >
                {/* Nome */}
                <div className="px-4 py-2.5 flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {client.nameReduced}
                    </p>
                    {client.accountManager && (
                      <p className="text-xs text-zinc-500 truncate">{client.accountManager}</p>
                    )}
                  </div>
                </div>

                {/* BU */}
                <div className="px-2 py-2.5 text-center">
                  <span className="text-xs text-violet-400 font-medium bg-violet-500/10 px-1.5 py-0.5 rounded">
                    {client.entity ?? '—'}
                  </span>
                </div>

                {/* Células de mês */}
                {Array.from({ length: 12 }, (_, i) => {
                  const m    = i + 1
                  const cell = grid[client.id]?.[m]
                  const isCurrent = m === CURRENT_MONTH
                  const isPast    = m < CURRENT_MONTH

                  return (
                    <div key={m} className="px-1 py-1.5">
                      <input
                        type="text"
                        value={cell?.value ?? ''}
                        onChange={e => handleChange(client.id, m, e.target.value)}
                        placeholder={isPast || isCurrent ? '0,000' : '—'}
                        className={cn(
                          'w-full text-right text-xs px-2 py-1.5 rounded-md outline-none transition-all duration-150',
                          'bg-transparent border',
                          'placeholder:text-zinc-700',
                          // Célula normal
                          !cell?.dirty && !cell?.saved && 'border-white/10 text-zinc-300 focus:border-violet-500/60 focus:bg-violet-950/20',
                          // Editada (não salva)
                          cell?.dirty && 'border-amber-500/50 text-amber-200 bg-amber-950/20',
                          // Salva
                          cell?.saved && 'border-emerald-500/30 text-emerald-300 bg-emerald-950/10',
                          // Mês atual
                          isCurrent && !cell?.dirty && !cell?.saved && 'border-violet-500/30 bg-violet-950/10',
                        )}
                      />
                    </div>
                  )
                })}

                {/* Total da linha */}
                <div className="px-2 py-2.5 text-right">
                  <span className={cn(
                    'text-sm font-medium',
                    total > 0 ? 'text-zinc-100' : 'text-zinc-600'
                  )}>
                    {total > 0 ? fmtCurrency(total) : '—'}
                  </span>
                </div>

                {/* Botão salvar */}
                <div className="px-2 py-2.5 flex justify-center">
                  <button
                    onClick={() => saveRow(client.id)}
                    disabled={!dirty || loading}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                      dirty && !loading
                        ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer shadow-lg shadow-violet-900/40'
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    )}
                  >
                    {loading ? (
                      <span className="animate-spin rounded-full h-3 w-3 border border-zinc-400 border-t-transparent" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    {loading ? 'Salvando' : 'Salvar'}
                  </button>
                </div>
              </div>
            )
          })}

          {/* ── Linha de totais ── */}
          <div
            className="grid items-center border-t border-violet-500/20 bg-zinc-900/70"
            style={{ gridTemplateColumns: '1fr 80px repeat(12, minmax(90px,1fr)) 110px 80px' }}
          >
            <div className="px-4 py-3 text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Total
            </div>
            <div />
            {colTotals.map((v, i) => (
              <div key={i} className={cn('px-2 py-3 text-right text-xs font-semibold', i + 1 === CURRENT_MONTH ? 'text-violet-300' : 'text-zinc-300')}>
                {v > 0 ? fmtCurrency(v) : '—'}
              </div>
            ))}
            <div className="px-2 py-3 text-right text-sm font-bold text-white">
              {fmtCurrency(grandTotal)}
            </div>
            <div />
          </div>
        </div>

        {/* ── Nota de rodapé ── */}
        <p className="mt-3 text-xs text-zinc-600 px-1">
          Valores em R$ — insira números como <span className="text-zinc-500">1.250.000</span> ou <span className="text-zinc-500">1,25M</span>.
          Clique em <strong className="text-zinc-500">Salvar</strong> para confirmar linha por linha.
        </p>
      </div>
    </div>
  )
}

// ── Painel de gerenciamento de clientes manuais ────────────────────────────────

export function ManualClientsInfo({ clients }: { clients: ManualClient[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {clients.map(c => (
        <div
          key={c.id}
          className="rounded-lg border border-white/10 bg-zinc-900/40 px-3 py-2.5 flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center flex-shrink-0">
            <PencilLine className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">{c.nameReduced}</p>
            <p className="text-xs text-violet-400">{c.entity}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
