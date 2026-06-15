'use client'

import { useState, useMemo, useCallback, useRef, ReactNode, CSSProperties } from 'react'
import { ChevronRight, ChevronDown, Search, Lock } from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type MonthEntry = {
  plan:         number
  fc:           number | null
  orders:       number | null
  withoutOrders: number | null
  faturado:     number          // ActualWeekly (Conexos) + fallback Excel
  lastWeek:     number | null
  mbPlan:       number | null
  mbFc:         number | null
  refExternal:  number          // ActualNF WHERE processRef IS NOT NULL
  weekComment:  string | null
}

export type ClientData = {
  id:             string
  nameReduced:    string
  nameChart:      string | null
  entity:         string | null   // BU
  commercialType: string | null   // COMERCIAL
  pl4Bu:          string | null   // 4PL
  modality:       string | null   // MODALIDADE
  accountManager: string | null   // CONTA
  sortOrder:      number
  months:         Record<number, MonthEntry>
}

export type WeekSnapshotEntry = {
  clientId: string
  month:    number
  isoYear:  number
  isoWeek:  number
  fcValue:  number | null
}

type MonthTotals = {
  plan: number; fc: number; faturado: number
  lastWeek: number; mbPlan: number; mbFc: number; refExternal: number
}

type GroupNode = {
  type:         'group'
  key:          string
  parentKey:    string
  ancestorKeys: string[]
  level:        0 | 1
  label:        string
  childCount:   number
  monthTotals:  Record<number, MonthTotals>
}

type ClientNode = {
  type:         'client'
  key:          string
  parentKey:    string
  ancestorKeys: string[]
  level:        2
  data:         ClientData
}

type TreeNode = GroupNode | ClientNode

export type ForecastMatrixProps = {
  clients:          ClientData[]
  year:             number
  currentMonth:     number
  weeklySnapshots?: WeekSnapshotEntry[]
}

// ── Constantes ────────────────────────────────────────────────────────────────

const LILAS   = '#422c76'
const MAGENTA = '#ff2f69'
const VERDE   = '#01E18E'
const GRAFITE = '#414042'
const OFFWHITE = '#faf9f5'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS      = Array.from({ length: 12 }, (_, i) => i + 1)

const BU_PALETTE: Record<string, { color: string; bg: string }> = {
  'VCI':       { color: LILAS,    bg: 'rgba(66,44,118,0.12)' },
  'ARM - GRV': { color: MAGENTA,  bg: 'rgba(255,47,105,0.12)' },
  'ARM - ITV': { color: '#00b870',bg: 'rgba(1,225,142,0.12)' },
  'ARM - NVG': { color: '#d97706',bg: 'rgba(245,158,11,0.12)' },
  'TRP':       { color: '#6b6570',bg: 'rgba(107,101,112,0.1)' },
}

const LEVEL_INDENT = [0, 16, 32] as const

const LEVEL_BG = [
  '#f4f2f7',  // BU
  '#f7f6f9',  // Categoria
  '#ffffff',  // CLIENT
] as const

const LEVEL_LABEL_COLOR = [
  LILAS,
  '#4a3a7a',
  GRAFITE,
] as const

type ExpCol = {
  key:       string
  label:     string
  w:         number
  align:     'right' | 'left'
  editable?: boolean
  lockable?: boolean
}

// Colunas fixas quando MÊS EXPANDIDO (11 colunas, sem COMENTÁRIO):
const EXP_COLS: ExpCol[] = [
  { key: 'plan',          label: 'PLANO',       w: 72,  align: 'right' },
  { key: 'fc',            label: 'FORECAST',    w: 72,  align: 'right', editable: true, lockable: true },
  { key: 'orders',        label: 'PEDIDO',      w: 68,  align: 'right', editable: true, lockable: true },
  { key: 'withoutOrders', label: 'S/PEDIDO',    w: 68,  align: 'right' },
  { key: 'faturado',      label: 'FATURADO',    w: 72,  align: 'right' },
  { key: 'refExternal',   label: 'REF.EXTERNA', w: 80,  align: 'right' },
  { key: 'desvioPlano',   label: 'DESV.PLANO',  w: 72,  align: 'right' },
  { key: 'aFaturar',      label: 'A FATURAR',   w: 72,  align: 'right' },
  { key: 'mbPlan',        label: 'MB PLAN',     w: 68,  align: 'right', editable: true },
  { key: 'mbFc',          label: 'MB FC',       w: 68,  align: 'right' },
  { key: 'lastWeek',      label: 'ÚLT.SEM.',    w: 68,  align: 'right', editable: true },
]
// COMENTÁRIO fica sempre após as colunas de semana (W24, W25…)
const COMMENT_COL: ExpCol = { key: 'weekComment', label: 'COMENTÁRIO', w: 140, align: 'left', editable: true }

const EXP_W_TOTAL = EXP_COLS.reduce((s, c) => s + c.w, 0) + COMMENT_COL.w  // 920px
const COL_W  = 130 // collapsed: PLANO + FC
const COL_W2 = 65  // each collapsed sub-col
const STICKY_W = 272

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, currency = true): string {
  if (v == null || v === 0) return '—'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}${Math.round(abs / 1_000)}K`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function desvPct(base: number, actual: number): number | null {
  if (!base) return null
  return ((actual - base) / base) * 100
}

function pctColor(pct: number | null): string {
  if (pct == null) return 'rgba(65,64,66,0.2)'
  if (pct >= 0)    return '#00b870'
  if (pct >= -10)  return '#d97706'
  return MAGENTA
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  for (const item of arr) {
    const k = fn(item)
    if (!out[k]) out[k] = []
    out[k].push(item)
  }
  return out
}

function isFcLocked(): boolean {
  // Converte para horário de Brasília (UTC-3)
  const brt  = new Date(new Date().getTime() - 3 * 60 * 60 * 1000)
  const day  = brt.getUTCDay()
  const hour = brt.getUTCHours()
  if (day === 1 && hour < 8)  return true  // Segunda antes das 08h
  if (day === 4 && hour >= 22) return true // Quinta a partir das 22h
  if (day === 5 || day === 6 || day === 0) return true // Sex / Sáb / Dom
  return false
}

function sumTotals(clients: ClientData[]): Record<number, MonthTotals> {
  const t: Record<number, MonthTotals> = {}
  for (let m = 1; m <= 12; m++) {
    t[m] = { plan: 0, fc: 0, faturado: 0, lastWeek: 0, mbPlan: 0, mbFc: 0, refExternal: 0 }
    for (const c of clients) {
      const md = c.months[m]
      if (!md) continue
      t[m].plan        += md.plan
      t[m].fc          += md.fc ?? md.plan
      t[m].faturado    += md.faturado
      t[m].lastWeek    += md.lastWeek ?? 0
      t[m].mbPlan      += md.mbPlan ?? 0
      t[m].mbFc        += md.mbFc ?? 0
      t[m].refExternal += md.refExternal
    }
  }
  return t
}

function buildTree(clients: ClientData[]): TreeNode[] {
  const nodes: TreeNode[] = []

  const sorted = [...clients].sort((a, b) =>
    (a.entity ?? '').localeCompare(b.entity ?? '', 'pt-BR') ||
    (a.commercialType ?? '').localeCompare(b.commercialType ?? '', 'pt-BR') ||
    (a.sortOrder - b.sortOrder) ||
    (a.nameReduced ?? '').localeCompare(b.nameReduced ?? '', 'pt-BR')
  )

  const byBU = groupBy(sorted, c => c.entity ?? '—')
  for (const [bu, buClients] of Object.entries(byBU)) {
    const buKey = `bu:${bu}`
    nodes.push({
      type: 'group', level: 0, key: buKey, parentKey: '', ancestorKeys: [],
      label: bu, childCount: buClients.length, monthTotals: sumTotals(buClients),
    })

    const byCOM = groupBy(buClients, c => c.commercialType ?? '—')
    for (const [com, comClients] of Object.entries(byCOM)) {
      const comKey = `${buKey}|com:${com}`
      nodes.push({
        type: 'group', level: 1, key: comKey, parentKey: buKey, ancestorKeys: [buKey],
        label: com, childCount: comClients.length, monthTotals: sumTotals(comClients),
      })

      for (const c of comClients) {
        nodes.push({
          type: 'client', level: 2, key: `c:${c.id}`, parentKey: comKey,
          ancestorKeys: [buKey, comKey], data: c,
        })
      }
    }
  }
  return nodes
}

// ── Célula editável ───────────────────────────────────────────────────────────

type EditCellProps = {
  value:     number | null
  onSave:    (v: number | null) => Promise<void>
  locked?:   boolean
  numeric?:  boolean
  isCurrent: boolean
  isHistory: boolean
}

function EditCell({ value, onSave, locked, isCurrent, isHistory }: EditCellProps) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal]     = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    if (locked || isHistory) return
    setLocal(value != null && value !== 0 ? String(value) : '')
    setEditing(true)
    setTimeout(() => ref.current?.select(), 0)
  }

  const commit = async () => {
    setEditing(false)
    const n = local.trim() === '' ? null : Number(local.replace(',', '.'))
    if (!isNaN(n as number) && n !== value) await onSave(n)
  }

  if (locked) return (
    <div className="flex items-center justify-end gap-1 w-full" title="Bloqueado após quinta 22h">
      <Lock className="w-3 h-3 opacity-30 flex-shrink-0" />
      <span className="tabular-nums" style={{ color: value ? GRAFITE : 'rgba(65,64,66,0.2)' }}>
        {value ? fmt(value) : '—'}
      </span>
    </div>
  )

  if (isHistory) return (
    <span className="tabular-nums" style={{ color: value ? '#00b870' : 'rgba(65,64,66,0.15)' }}>
      {value ? fmt(value) : '—'}
    </span>
  )

  if (editing) return (
    <input
      ref={ref}
      type="number"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      className="w-full text-right outline-none bg-transparent border-b tabular-nums text-xs"
      style={{ borderColor: LILAS, color: LILAS }}
    />
  )

  return (
    <button
      onClick={startEdit}
      className="w-full text-right tabular-nums cursor-text group/ecell transition-colors"
      title={isCurrent ? 'Clique para editar' : ''}
    >
      <span style={{ color: value ? GRAFITE : 'rgba(65,64,66,0.2)' }}>
        {value ? fmt(value) : <span className="group-hover/ecell:text-purple-400">—</span>}
      </span>
    </button>
  )
}

function CommentCell({
  value, onSave, isCurrent,
}: { value: string | null; onSave: (v: string) => Promise<void>; isCurrent: boolean }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal]     = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const startEdit = () => {
    if (!isCurrent) return
    setLocal(value ?? '')
    setEditing(true)
    setTimeout(() => ref.current?.focus(), 0)
  }

  const commit = async () => {
    setEditing(false)
    if (local !== (value ?? '')) await onSave(local)
  }

  if (editing) return (
    <textarea
      ref={ref}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      rows={2}
      className="w-full text-xs outline-none bg-white border rounded p-1 resize-none"
      style={{ borderColor: LILAS, color: GRAFITE, minWidth: '130px' }}
    />
  )

  return (
    <button
      onClick={startEdit}
      className="w-full text-left text-xs cursor-text truncate max-w-[130px]"
      title={value ?? ''}
      style={{ color: value ? GRAFITE : 'rgba(65,64,66,0.2)' }}
    >
      {value || (isCurrent ? <span className="italic opacity-40">Adicionar...</span> : '—')}
    </button>
  )
}

// ── Componente Principal ──────────────────────────────────────────────────────

export function ForecastMatrix({ clients, year, currentMonth, weeklySnapshots }: ForecastMatrixProps) {
  const fcLocked = isFcLocked()

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(() => new Set([currentMonth]))
  const [filterBU,   setFilterBU]   = useState('all')
  const [filterCOM,  setFilterCOM]  = useState('all')
  const [filterMOD,  setFilterMOD]  = useState('all')
  const [filterCNTA, setFilterCNTA] = useState('all')
  const [search,     setSearch]     = useState('')

  // Valores editados localmente (otimista)
  const [localEdits, setLocalEdits] = useState<Map<string, number | string | null>>(() => new Map())

  const treeNodes = useMemo(() => buildTree(clients), [clients])

  // Filtrar clientes que batem com os filtros ativos
  const filteredIds = useMemo(() => {
    const ids = new Set<string>()
    const q = search.toLowerCase()
    for (const n of treeNodes) {
      if (n.type !== 'client') continue
      const c = n.data
      if (filterBU   !== 'all' && c.entity        !== filterBU)   continue
      if (filterCOM  !== 'all' && c.commercialType !== filterCOM)  continue
      if (filterMOD  !== 'all' && c.modality       !== filterMOD)  continue
      if (filterCNTA !== 'all' && c.accountManager !== filterCNTA) continue
      if (q && !(c.nameReduced ?? '').toLowerCase().includes(q)) continue
      ids.add(c.id)
    }
    return ids
  }, [treeNodes, filterBU, filterCOM, filterMOD, filterCNTA, search])

  // Grupos que têm ao menos 1 filho filtrado
  const activeGroups = useMemo(() => {
    const gs = new Set<string>()
    for (const n of treeNodes) {
      if (n.type !== 'client') continue
      if (!filteredIds.has(n.data.id)) continue
      for (const ak of n.ancestorKeys) gs.add(ak)
    }
    return gs
  }, [treeNodes, filteredIds])

  const visibleNodes = useMemo(() => {
    return treeNodes.filter(n => {
      if (n.level === 0) return activeGroups.has(n.key)  // BU sempre visível se tem filhos filtrados
      if (!expandedGroups.has(n.parentKey)) return false
      if (n.type === 'group')  return activeGroups.has(n.key)
      return filteredIds.has(n.data.id)
    })
  }, [treeNodes, expandedGroups, filteredIds, activeGroups])

  // Grand totals (only filtered clients)
  const grandTotals = useMemo(() => {
    const filtered = clients.filter(c => filteredIds.has(c.id))
    return sumTotals(filtered)
  }, [clients, filteredIds])

  // Semanas disponíveis nos snapshots, ordenadas da mais recente para a mais antiga
  const snapshotWeeks = useMemo(() => {
    if (!weeklySnapshots?.length) return [] as { isoYear: number; isoWeek: number }[]
    const seen = new Set<string>()
    const result: { isoYear: number; isoWeek: number }[] = []
    for (const s of weeklySnapshots) {
      const k = `${s.isoYear}-${s.isoWeek}`
      if (!seen.has(k)) { seen.add(k); result.push({ isoYear: s.isoYear, isoWeek: s.isoWeek }) }
    }
    return result.sort((a, b) =>
      b.isoYear !== a.isoYear ? b.isoYear - a.isoYear : b.isoWeek - a.isoWeek
    )
  }, [weeklySnapshots])

  // Lookup: clientId → month → isoWeek → fcValue
  const snapshotMap = useMemo(() => {
    const map = new Map<string, Map<number, Map<number, number | null>>>()
    for (const s of (weeklySnapshots ?? [])) {
      if (!map.has(s.clientId)) map.set(s.clientId, new Map())
      const byMonth = map.get(s.clientId)!
      if (!byMonth.has(s.month)) byMonth.set(s.month, new Map())
      byMonth.get(s.month)!.set(s.isoWeek, s.fcValue)
    }
    return map
  }, [weeklySnapshots])

  // Totais de snapshot por (isoWeek × month) para a linha de rodapé
  const snapshotTotals = useMemo(() => {
    const map = new Map<number, Map<number, number>>()
    for (const s of (weeklySnapshots ?? [])) {
      if (!filteredIds.has(s.clientId)) continue
      if (!map.has(s.isoWeek)) map.set(s.isoWeek, new Map())
      const byMonth = map.get(s.isoWeek)!
      byMonth.set(s.month, (byMonth.get(s.month) ?? 0) + (s.fcValue ?? 0))
    }
    return map
  }, [weeklySnapshots, filteredIds])

  // Totais de snapshot por grupo (groupKey → isoWeek → month → total)
  const groupSnapshotTotals = useMemo(() => {
    const result = new Map<string, Map<number, Map<number, number>>>()
    for (const node of treeNodes) {
      if (node.type !== 'client') continue
      if (!filteredIds.has(node.data.id)) continue
      const clientSnap = snapshotMap.get(node.data.id)
      if (!clientSnap) continue
      for (const ak of node.ancestorKeys) {
        if (!result.has(ak)) result.set(ak, new Map())
        const grpByWeek = result.get(ak)!
        clientSnap.forEach((byWeek, month) => {
          byWeek.forEach((fcVal, isoWeek) => {
            if (fcVal == null) return
            if (!grpByWeek.has(isoWeek)) grpByWeek.set(isoWeek, new Map())
            const byMonth = grpByWeek.get(isoWeek)!
            byMonth.set(month, (byMonth.get(month) ?? 0) + fcVal)
          })
        })
      }
    }
    return result
  }, [treeNodes, filteredIds, snapshotMap])

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        // Colapsar: remove o grupo e todos os descendentes
        for (const k of next) {
          if (k === key || k.startsWith(key + '|')) next.delete(k)
        }
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleMonth = useCallback((m: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m); else next.add(m)
      return next
    })
  }, [])

  const getLocal = (clientId: string, month: number, field: string) => {
    const k = `${clientId}:${month}:${field}`
    return localEdits.has(k) ? localEdits.get(k) : undefined
  }

  const saveEntry = async (clientId: string, month: number, field: string, value: number | null) => {
    // Optimistic update
    const k = `${clientId}:${month}:${field}`
    setLocalEdits(prev => new Map(prev).set(k, value))
    try {
      await fetch('/api/forecast/entry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, year, month, field, value }),
      })
    } catch {
      // Revert on error
      setLocalEdits(prev => { const m = new Map(prev); m.delete(k); return m })
    }
  }

  const saveComment = async (clientId: string, month: number, comment: string) => {
    const k = `${clientId}:${month}:weekComment`
    setLocalEdits(prev => new Map(prev).set(k, comment))
    try {
      await fetch('/api/forecast/comment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, year, month, comment }),
      })
    } catch {
      setLocalEdits(prev => { const m = new Map(prev); m.delete(k); return m })
    }
  }

  // Compute min-width (snapshot cols = 68px cada)
  const SNAP_COL_W = 68
  const tableMinWidth = STICKY_W + MONTHS.reduce((s, m) =>
    s + (expandedMonths.has(m) ? EXP_W_TOTAL + snapshotWeeks.length * SNAP_COL_W : COL_W), 0
  ) + 88  // anual

  // Options for filter dropdowns
  const opts = useMemo(() => {
    const bu = new Set<string>(), com = new Set<string>(),
          mod = new Set<string>(), cnt = new Set<string>()
    for (const c of clients) {
      if (c.entity)         bu.add(c.entity)
      if (c.commercialType) com.add(c.commercialType)
      if (c.modality)       mod.add(c.modality)
      if (c.accountManager) cnt.add(c.accountManager)
    }
    return { bu: [...bu].sort(), com: [...com].sort(), mod: [...mod].sort(), cnt: [...cnt].sort() }
  }, [clients])

  const filterSel = (filterBU !== 'all' || filterCOM !== 'all' ||
    filterMOD !== 'all' || filterCNTA !== 'all' || search !== '')

  const resetFilters = () => {
    setFilterBU('all'); setFilterCOM('all')
    setFilterMOD('all'); setFilterCNTA('all'); setSearch('')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: OFFWHITE }}>

      {/* ── Barra de filtros ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{
          background: '#fff',
          borderBottom: '1px solid rgba(66,44,118,0.1)',
          boxShadow: '0 1px 8px rgba(66,44,118,0.05)',
        }}
      >
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#9a8fb5' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl w-48 focus:outline-none"
            style={{ background: OFFWHITE, border: '1.5px solid rgba(66,44,118,0.15)', color: GRAFITE }}
          />
        </div>

        {/* Filtros */}
        {([
          ['BU',         filterBU,   setFilterBU,   opts.bu,  'Todas as BUs'],
          ['CATEGORIA',  filterCOM,  setFilterCOM,  opts.com, 'Todas Categorias'],
          ['MODALIDADE', filterMOD,  setFilterMOD,  opts.mod, 'Todas Modalidades'],
          ['CONTA',      filterCNTA, setFilterCNTA, opts.cnt, 'Todas Contas'],
        ] as const).map(([label, val, setter, options, placeholder]) => (
          <div key={label} className="flex items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#9a8fb5' }}>{label}</span>
            <select
              value={val}
              onChange={e => (setter as (v: string) => void)(e.target.value)}
              className="text-xs rounded-xl px-2 py-1.5 focus:outline-none"
              style={{ background: val !== 'all' ? 'rgba(66,44,118,0.08)' : OFFWHITE,
                border: '1.5px solid rgba(66,44,118,0.15)', color: val !== 'all' ? LILAS : GRAFITE,
                fontWeight: val !== 'all' ? 700 : 400 }}
            >
              <option value="all">{placeholder}</option>
              {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {filterSel && (
          <button
            onClick={resetFilters}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg"
            style={{ color: MAGENTA, background: 'rgba(255,47,105,0.08)' }}
          >
            Limpar filtros
          </button>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: '#9a8fb5' }}>
          {fcLocked ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ color: '#d97706', background: 'rgba(217,119,6,0.08)' }}>
              <Lock className="w-3 h-3" /> Janela fechada — abre seg 08h
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ color: '#00b870', background: 'rgba(0,184,112,0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00b870] inline-block" /> Janela aberta — fecha qui 22h
            </span>
          )}
          <span className="tabular-nums">
            {filteredIds.size} clientes · {year}
          </span>
        </div>
      </div>

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table
          className="border-collapse text-xs"
          style={{ tableLayout: 'fixed', minWidth: `${tableMinWidth}px`, width: '100%' }}
        >
          <colgroup>
            <col style={{ width: `${STICKY_W}px`, minWidth: `${STICKY_W}px` }} />
            {MONTHS.flatMap(m =>
              expandedMonths.has(m)
                ? [
                    ...EXP_COLS.map((c, i) => <col key={`${m}-${i}`} style={{ width: `${c.w}px` }} />),
                    ...snapshotWeeks.map((_, wi) => <col key={`${m}-snap-${wi}`} style={{ width: `${SNAP_COL_W}px` }} />),
                    <col key={`${m}-cmt`} style={{ width: `${COMMENT_COL.w}px` }} />,
                  ]
                : [<col key={m} style={{ width: `${COL_W2}px` }} />,
                   <col key={`${m}b`} style={{ width: `${COL_W2}px` }} />]
            )}
            <col style={{ width: '88px' }} />
          </colgroup>

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <thead className="sticky top-0 z-20">
            {/* Linha 1: meses */}
            <tr>
              <th
                className="sticky left-0 z-30 text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: LILAS, color: 'rgba(255,255,255,0.45)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
              >
                Hierarquia
              </th>
              {MONTHS.flatMap(m => {
                const isExp  = expandedMonths.has(m)
                const isCurr = m === currentMonth
                const span   = isExp ? EXP_COLS.length + snapshotWeeks.length + 1 : 2
                return [
                  <th
                    key={m}
                    colSpan={span}
                    onClick={() => toggleMonth(m)}
                    className="text-center py-2.5 px-1 text-[11px] font-bold cursor-pointer select-none"
                    style={{
                      background: isCurr ? MAGENTA : LILAS,
                      color: isCurr ? '#fff' : 'rgba(255,255,255,0.8)',
                      borderLeft: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <span className="flex items-center justify-center gap-0.5">
                      {MONTH_NAMES[m - 1]}
                      {isCurr && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 inline-block" />}
                      {isExp
                        ? <ChevronDown className="w-3 h-3 opacity-60" />
                        : <ChevronRight className="w-3 h-3 opacity-40" />
                      }
                    </span>
                  </th>
                ]
              })}
              <th
                className="text-center py-2.5 text-[11px] font-bold"
                style={{ background: '#2d1d5c', color: 'rgba(255,255,255,0.5)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
              >
                ANUAL
              </th>
            </tr>

            {/* Linha 2: sub-colunas */}
            <tr style={{ background: '#f3f0f9', borderBottom: '2px solid rgba(66,44,118,0.15)' }}>
              <th
                className="sticky left-0 z-30 px-3 py-1.5 text-[11px] font-bold text-left"
                style={{ background: '#f3f0f9', color: LILAS, borderRight: '1px solid rgba(66,44,118,0.12)' }}
              >
                Cliente / Dimensão
              </th>
              {MONTHS.flatMap(m => {
                if (expandedMonths.has(m)) {
                  return [
                    ...EXP_COLS.map((col, i) => (
                      <th
                        key={`${m}-${i}`}
                        className={`py-1.5 px-1.5 text-[9px] font-bold uppercase tracking-wide ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                        style={{
                          color: col.editable ? LILAS : '#9a8fb5',
                          borderLeft: i === 0 ? '1px solid rgba(66,44,118,0.12)' : undefined,
                          fontWeight: col.editable ? 800 : 600,
                        }}
                      >
                        {col.label}
                      </th>
                    )),
                    ...snapshotWeeks.map((wk, wi) => (
                      <th
                        key={`${m}-snap-${wi}`}
                        className="py-1.5 px-1.5 text-[9px] font-bold text-right uppercase tracking-wide"
                        style={{
                          color: '#7c5cbf',
                          borderLeft: wi === 0 ? '2px dashed rgba(66,44,118,0.2)' : undefined,
                          background: 'rgba(66,44,118,0.03)',
                        }}
                      >
                        W{wk.isoWeek}
                      </th>
                    )),
                    <th
                      key={`${m}-cmt`}
                      className="py-1.5 px-1.5 text-[9px] font-bold text-left uppercase tracking-wide"
                      style={{ color: LILAS, fontWeight: 800 }}
                    >
                      {COMMENT_COL.label}
                    </th>,
                  ]
                }
                return [
                  <th key={`${m}a`} className="py-1.5 px-1.5 text-[9px] font-semibold uppercase text-right border-l" style={{ color: '#9a8fb5', borderColor: 'rgba(66,44,118,0.1)' }}>Plano</th>,
                  <th key={`${m}b`} className="py-1.5 px-1.5 text-[9px] font-bold uppercase text-right" style={{ color: m <= currentMonth ? '#00b870' : LILAS }}>{m <= currentMonth ? 'Faturado' : 'FC'}</th>,
                ]
              })}
              <th className="py-1.5 px-1.5 text-[9px] font-semibold uppercase text-right border-l" style={{ color: '#9a8fb5', borderColor: 'rgba(66,44,118,0.15)' }}>Plano</th>
            </tr>
          </thead>

          {/* ── BODY ───────────────────────────────────────────────────── */}
          <tbody>
            {visibleNodes.map(node => {
              const indent = LEVEL_INDENT[node.level]
              const bg     = LEVEL_BG[node.level]

              if (node.type === 'group') {
                const totals = node.monthTotals
                const isExp  = expandedGroups.has(node.key)
                const buPal  = node.level === 0 ? (BU_PALETTE[node.label] ?? BU_PALETTE['TRP']) : null
                const annualPlan = MONTHS.reduce((s, m) => s + (totals[m]?.plan ?? 0), 0)

                return (
                  <tr
                    key={node.key}
                    style={{ borderBottom: '1px solid rgba(66,44,118,0.07)', background: bg }}
                  >
                    {/* Nome do grupo */}
                    <td
                      className="sticky left-0 z-10 py-2 cursor-pointer select-none"
                      style={{ background: bg, paddingLeft: `${indent + 8}px`, paddingRight: '8px' }}
                      onClick={() => toggleGroup(node.key)}
                    >
                      <div className="flex items-center gap-1.5">
                        {isExp
                          ? <ChevronDown  className="w-3.5 h-3.5 flex-shrink-0" style={{ color: LILAS }} />
                          : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: LILAS, opacity: 0.5 }} />
                        }
                        {buPal ? (
                          <span
                            className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-black"
                            style={{ background: buPal.bg, color: buPal.color }}
                          >
                            {node.label}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold truncate" style={{ color: LEVEL_LABEL_COLOR[node.level] }}>
                            {node.label}
                          </span>
                        )}
                        <span
                          className="ml-1 text-[10px] rounded-full px-1.5 font-medium flex-shrink-0"
                          style={{ background: 'rgba(66,44,118,0.08)', color: '#9a8fb5' }}
                        >
                          {node.childCount}
                        </span>
                      </div>
                    </td>

                    {/* Células de meses para grupo */}
                    {MONTHS.flatMap(m => {
                      const t = totals[m]
                      if (!t) return expandedMonths.has(m)
                        ? EXP_COLS.map((_, i) => <td key={`${m}-${i}`} />)
                        : [<td key={`${m}a`} />, <td key={`${m}b`} />]

                      const desv  = desvPct(t.plan, t.fc)
                      const fatPct = desvPct(t.plan, t.faturado)

                      if (expandedMonths.has(m)) {
                        const expCells = EXP_COLS.map((col, i) => {
                          let val: number | string | null = null
                          let color = '#9a8fb5'
                          switch (col.key) {
                            case 'plan':          val = t.plan;     color = GRAFITE;   break
                            case 'fc':            val = t.fc;       color = LILAS;     break
                            case 'orders':        val = t.fc;       color = '#9a8fb5'; break
                            case 'withoutOrders': val = t.fc - t.fc; break
                            case 'faturado':      val = t.faturado; color = '#00b870'; break
                            case 'desvioPlano':   val = t.fc - t.plan; color = pctColor(desv); break
                            case 'aFaturar':      val = t.fc - t.faturado; break
                            case 'lastWeek':      val = t.lastWeek;      break
                            case 'mbPlan':        val = t.mbPlan;        break
                            case 'mbFc':          val = t.mbFc;          break
                            case 'refExternal':   val = t.refExternal;   color = '#00b870'; break
                          }
                          return (
                            <td
                              key={`${m}-${i}`}
                              className={`px-1.5 py-2 text-xs tabular-nums ${col.align === 'right' ? 'text-right' : 'text-left'} font-semibold`}
                              style={{ color: typeof val === 'number' && val !== 0 ? color : 'rgba(65,64,66,0.2)', borderLeft: i === 0 ? '1px solid rgba(66,44,118,0.08)' : undefined }}
                            >
                              {typeof val === 'number' && val !== 0 ? fmt(val) : '—'}
                            </td>
                          )
                        })
                        const snapGrp = snapshotWeeks.map((wk, wi) => {
                          const grpTotal = groupSnapshotTotals.get(node.key)?.get(wk.isoWeek)?.get(m) ?? 0
                          return (
                            <td key={`${m}-grpsnap-${wi}`}
                                className="px-1.5 py-2 text-right text-xs tabular-nums font-semibold"
                                style={{
                                  borderLeft: wi === 0 ? '2px dashed rgba(66,44,118,0.12)' : undefined,
                                  background: 'rgba(66,44,118,0.02)',
                                  color: grpTotal > 0 ? LILAS : 'rgba(65,64,66,0.2)',
                                }}>
                              {grpTotal > 0 ? fmt(grpTotal) : '—'}
                            </td>
                          )
                        })
                        const cmtGrp = <td key={`${m}-grpcmt`} className="px-1.5 py-2 text-left text-xs" />
                        return [...expCells, ...snapGrp, cmtGrp]
                      }
                      // Collapsed: PLANO + FATURADO (passado) ou PLANO + FC (futuro)
                      const collVal = m <= currentMonth ? t.faturado : t.fc
                      const collColor = m <= currentMonth
                        ? (collVal ? '#00b870' : 'rgba(65,64,66,0.15)')
                        : (collVal ? LILAS : 'rgba(65,64,66,0.15)')
                      return [
                        <td key={`${m}a`} className="px-1.5 py-2 text-right tabular-nums text-[11px] font-semibold border-l" style={{ color: t.plan ? GRAFITE : 'rgba(65,64,66,0.15)', borderColor: 'rgba(66,44,118,0.07)' }}>
                          {fmt(t.plan)}
                        </td>,
                        <td key={`${m}b`} className="px-1.5 py-2 text-right tabular-nums text-[11px] font-bold" style={{ color: collColor }}>
                          {fmt(collVal)}
                        </td>,
                      ]
                    })}

                    {/* Anual */}
                    <td className="px-2 py-2 text-right tabular-nums font-bold text-[11px] border-l" style={{ color: LILAS, borderColor: 'rgba(66,44,118,0.12)' }}>
                      {fmt(annualPlan)}
                    </td>
                  </tr>
                )
              }

              // ── Client row ────────────────────────────────────────────
              const c = node.data
              const annualPlan = MONTHS.reduce((s, m) => s + (c.months[m]?.plan ?? 0), 0)
              const annualFc   = MONTHS.reduce((s, m) => s + (c.months[m]?.fc ?? c.months[m]?.plan ?? 0), 0)

              return (
                <tr
                  key={node.key}
                  className="group/row hover:bg-purple-50/30 transition-colors"
                  style={{ borderBottom: '1px solid rgba(66,44,118,0.05)', background: '#fff' }}
                >
                  <td
                    className="sticky left-0 z-10 py-2 group-hover/row:bg-[#f0ecff] transition-colors"
                    style={{ background: '#fff', paddingLeft: `${indent + 8}px`, paddingRight: '8px',
                      borderRight: '1px solid rgba(66,44,118,0.08)' }}
                    title={c.nameReduced}
                  >
                    <span className="text-[11px] font-medium truncate block max-w-[220px]" style={{ color: GRAFITE }}>
                      {c.nameChart ?? c.nameReduced}
                    </span>
                    {(c.pl4Bu || c.accountManager) && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {c.pl4Bu && (
                          <span className="text-[9px] font-semibold px-1.5 rounded-full flex-shrink-0"
                            style={{ background: 'rgba(66,44,118,0.08)', color: '#9a8fb5' }}>
                            {c.pl4Bu}
                          </span>
                        )}
                        {c.accountManager && (
                          <span className="text-[9px] truncate max-w-[140px]" style={{ color: '#b0a8c0' }}>
                            {c.accountManager}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {MONTHS.flatMap(m => {
                    const md       = c.months[m]
                    const isCurr   = m === currentMonth
                    const isHist   = m < currentMonth
                    const plan     = md?.plan ?? 0
                    const rawFc    = md?.fc
                    const localFc  = getLocal(c.id, m, 'fcMonth')
                    const fc       = localFc !== undefined ? (localFc as number) : (rawFc ?? plan)
                    const orders   = (getLocal(c.id, m, 'orders') as number | undefined) ?? md?.orders ?? fc
                    const faturado = md?.faturado ?? 0
                    const lastWeek = (getLocal(c.id, m, 'lastWeek') as number | undefined) ?? md?.lastWeek ?? null
                    const mbPlan   = (getLocal(c.id, m, 'mbPlan') as number | undefined) ?? md?.mbPlan ?? null
                    const mbFc     = md?.mbFc ?? null
                    const comment  = (getLocal(c.id, m, 'weekComment') as string | undefined) ?? md?.weekComment ?? null

                    const sPedido  = fc - (orders ?? fc)
                    const desv     = fc - plan
                    const aFaturar = fc - faturado

                    if (expandedMonths.has(m)) {
                      const expCells = EXP_COLS.map((col, i) => {
                        const bdr = i === 0 ? { borderLeft: '1px solid rgba(66,44,118,0.08)' } : {}

                        const makeTd = (content: ReactNode, extra?: CSSProperties) => (
                          <td
                            key={`${m}-${i}`}
                            className={`px-1.5 py-1 ${col.align === 'right' ? 'text-right' : 'text-left'} text-[11px] tabular-nums`}
                            style={{ ...bdr, ...extra }}
                          >
                            {content}
                          </td>
                        )

                        switch (col.key) {
                          case 'plan':
                            return makeTd(
                              <span style={{ color: plan ? GRAFITE : 'rgba(65,64,66,0.18)' }}>{fmt(plan)}</span>
                            )
                          case 'fc':
                            return makeTd(
                              <EditCell
                                value={rawFc !== undefined ? rawFc : null}
                                onSave={v => saveEntry(c.id, m, 'fcMonth', v)}
                                locked={fcLocked && !isHist}
                                isCurrent={isCurr}
                                isHistory={isHist}
                              />
                            )
                          case 'orders':
                            return makeTd(
                              <EditCell
                                value={md?.orders ?? null}
                                onSave={v => saveEntry(c.id, m, 'orders', v)}
                                locked={fcLocked && !isHist}
                                isCurrent={isCurr}
                                isHistory={isHist}
                              />
                            )
                          case 'withoutOrders':
                            return makeTd(
                              <span style={{ color: sPedido !== 0 ? (sPedido > 0 ? '#00b870' : MAGENTA) : 'rgba(65,64,66,0.2)' }}>
                                {sPedido !== 0 ? fmt(sPedido) : '—'}
                              </span>
                            )
                          case 'faturado':
                            return makeTd(
                              <span style={{ color: faturado > 0 ? '#00b870' : 'rgba(65,64,66,0.15)', fontWeight: faturado > 0 ? 600 : 400 }}>
                                {faturado > 0 ? fmt(faturado) : '—'}
                              </span>
                            )
                          case 'desvioPlano':
                            return makeTd(
                              <span style={{ color: pctColor(desvPct(plan, fc)), fontWeight: desv !== 0 ? 600 : 400 }}>
                                {desv !== 0 ? fmt(desv) : '—'}
                              </span>
                            )
                          case 'aFaturar':
                            return makeTd(
                              <span style={{ color: aFaturar > 0 ? GRAFITE : aFaturar < 0 ? MAGENTA : 'rgba(65,64,66,0.2)' }}>
                                {aFaturar !== 0 ? fmt(aFaturar) : '—'}
                              </span>
                            )
                          case 'lastWeek':
                            return makeTd(
                              <EditCell
                                value={lastWeek}
                                onSave={v => saveEntry(c.id, m, 'lastWeek', v)}
                                locked={false}
                                isCurrent={isCurr}
                                isHistory={false}
                              />
                            )
                          case 'mbPlan':
                            return makeTd(
                              <EditCell
                                value={mbPlan}
                                onSave={v => saveEntry(c.id, m, 'mbPlanPct', v)}
                                locked={false}
                                isCurrent={isCurr}
                                isHistory={false}
                              />
                            )
                          case 'mbFc':
                            return makeTd(
                              <span style={{ color: mbFc ? '#00b870' : 'rgba(65,64,66,0.15)' }}>
                                {mbFc ? fmt(mbFc) : '—'}
                              </span>
                            )
                          case 'refExternal': {
                            const refExt = md?.refExternal ?? 0
                            return makeTd(
                              <span style={{ color: refExt > 0 ? '#00b870' : 'rgba(65,64,66,0.15)' }}>
                                {refExt > 0 ? fmt(refExt) : '—'}
                              </span>
                            )
                          }
                          default:
                            return makeTd(null)
                        }
                      })
                      const snapCells = snapshotWeeks.map((wk, wi) => {
                        const fcSnap = snapshotMap.get(c.id)?.get(m)?.get(wk.isoWeek) ?? null
                        return (
                          <td
                            key={`${m}-snap-${wi}`}
                            className="px-1.5 py-1 text-right text-[11px] tabular-nums"
                            style={{
                              borderLeft: wi === 0 ? '2px dashed rgba(66,44,118,0.2)' : undefined,
                              background: 'rgba(66,44,118,0.025)',
                              color: fcSnap != null && fcSnap !== 0 ? '#7c5cbf' : 'rgba(65,64,66,0.15)',
                              fontWeight: fcSnap != null && fcSnap !== 0 ? 500 : 400,
                            }}
                          >
                            {fcSnap != null && fcSnap !== 0 ? fmt(fcSnap) : '—'}
                          </td>
                        )
                      })
                      const cmtCell = (
                        <td key={`${m}-cmt`} className="px-1.5 py-1 text-left">
                          <CommentCell
                            value={comment}
                            onSave={v => saveComment(c.id, m, v)}
                            isCurrent={isCurr}
                          />
                        </td>
                      )
                      return [...expCells, ...snapCells, cmtCell]
                    }

                    // Collapsed: PLANO + FATURADO (passado/atual) ou PLANO + FC (futuro)
                    const collClientVal = m <= currentMonth ? faturado : fc
                    const collClientColor = m <= currentMonth
                      ? (faturado > 0 ? '#00b870' : 'rgba(65,64,66,0.18)')
                      : (fc !== plan ? LILAS : '#9a8fb5')
                    return [
                      <td key={`${m}a`} className="px-1.5 py-1.5 text-right tabular-nums text-[11px] border-l" style={{ color: plan ? GRAFITE : 'rgba(65,64,66,0.18)', borderColor: 'rgba(66,44,118,0.07)' }}>
                        {plan ? fmt(plan) : '—'}
                      </td>,
                      <td key={`${m}b`} className="px-1.5 py-1.5 text-right tabular-nums text-[11px] font-semibold" style={{ color: collClientColor }}>
                        {collClientVal ? fmt(collClientVal) : '—'}
                      </td>,
                    ]
                  })}

                  {/* Anual */}
                  <td className="px-2 py-1.5 text-right tabular-nums font-bold text-[11px] border-l" style={{ color: LILAS, borderColor: 'rgba(66,44,118,0.12)' }}>
                    {fmt(annualPlan)}
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* ── TOTAIS ─────────────────────────────────────────────────── */}
          <tfoot>
            <tr style={{ background: LILAS, borderTop: `2px solid ${LILAS}` }}>
              <td
                className="sticky left-0 z-10 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: LILAS, color: 'rgba(255,255,255,0.7)' }}
              >
                TOTAL — {filteredIds.size} clientes
              </td>
              {MONTHS.flatMap(m => {
                const t = grandTotals[m]
                const desv = desvPct(t.plan, t.faturado)
                const hasFat = t.faturado > 0

                if (expandedMonths.has(m)) {
                  const ftCells = EXP_COLS.map((col, i) => {
                    const bdr = i === 0 ? { borderLeft: '1px solid rgba(255,255,255,0.1)' } : {}
                    switch (col.key) {
                      case 'plan':         return <td key={`${m}-${i}`} className="px-1.5 py-2.5 text-right font-bold text-[11px] text-white tabular-nums" style={bdr}>{fmt(t.plan)}</td>
                      case 'fc':           return <td key={`${m}-${i}`} className="px-1.5 py-2.5 text-right font-bold text-[11px] tabular-nums" style={{ ...bdr, color: 'rgba(255,255,255,0.9)' }}>{fmt(t.fc)}</td>
                      case 'faturado':     return <td key={`${m}-${i}`} className="px-1.5 py-2.5 text-right font-bold text-[11px] tabular-nums" style={{ ...bdr, color: hasFat ? VERDE : 'rgba(255,255,255,0.2)' }}>{hasFat ? fmt(t.faturado) : '—'}</td>
                      case 'desvioPlano':  return <td key={`${m}-${i}`} className="px-1.5 py-2.5 text-right font-bold text-[11px] tabular-nums" style={{ ...bdr, color: 'rgba(255,255,255,0.5)' }}>{fmt(t.fc - t.plan)}</td>
                      case 'mbPlan':       return <td key={`${m}-${i}`} className="px-1.5 py-2.5 text-right font-semibold text-[11px] tabular-nums" style={{ ...bdr, color: 'rgba(255,255,255,0.5)' }}>{fmt(t.mbPlan)}</td>
                      case 'mbFc':         return <td key={`${m}-${i}`} className="px-1.5 py-2.5 text-right font-semibold text-[11px] tabular-nums" style={{ ...bdr, color: 'rgba(255,255,255,0.5)' }}>{fmt(t.mbFc)}</td>
                      case 'refExternal':  return <td key={`${m}-${i}`} className="px-1.5 py-2.5 text-right font-semibold text-[11px] tabular-nums" style={{ ...bdr, color: t.refExternal > 0 ? VERDE : 'rgba(255,255,255,0.2)' }}>{t.refExternal > 0 ? fmt(t.refExternal) : '—'}</td>
                      default:             return <td key={`${m}-${i}`} style={bdr} />
                    }
                  })
                  const ftSnap = snapshotWeeks.map((wk, wi) => {
                    const total = snapshotTotals.get(wk.isoWeek)?.get(m) ?? 0
                    return (
                      <td
                        key={`${m}-ftsnap-${wi}`}
                        className="px-1.5 py-2.5 text-right font-semibold text-[11px] tabular-nums"
                        style={{
                          borderLeft: wi === 0 ? '2px dashed rgba(255,255,255,0.15)' : undefined,
                          color: total > 0 ? 'rgba(200,180,255,0.85)' : 'rgba(255,255,255,0.2)',
                          background: 'rgba(0,0,0,0.06)',
                        }}
                      >
                        {total > 0 ? fmt(total) : '—'}
                      </td>
                    )
                  })
                  const ftCmt = <td key={`${m}-ftcmt`} />
                  return [...ftCells, ...ftSnap, ftCmt]
                }
                return [
                  <td key={`${m}a`} className="px-1.5 py-2.5 text-right font-bold text-white text-[11px] tabular-nums border-l" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>{fmt(t.plan)}</td>,
                  <td key={`${m}b`} className="px-1.5 py-2.5 text-right font-bold text-[11px] tabular-nums" style={{ color: m <= currentMonth ? (t.faturado > 0 ? VERDE : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.7)' }}>{fmt(m <= currentMonth ? t.faturado : t.fc)}</td>,
                ]
              })}
              <td className="px-2 py-2.5 text-right font-extrabold text-[12px] tabular-nums text-white border-l" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                {fmt(MONTHS.reduce((s, m) => s + (grandTotals[m]?.plan ?? 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
