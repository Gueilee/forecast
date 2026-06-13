'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { KpiCards } from './KpiCards'
import { RevenueChart } from './RevenueChart'
import { BuSummaryTable } from './BuSummaryTable'
import { DailyChart, DashboardFilters } from './DailyChart'

const LILAS    = '#422c76'
const GRAFITE  = '#414042'
const OFFWHITE = '#faf9f5'
const MAGENTA  = '#ff2f69'

export interface ClientMeta {
  id: string
  entity: string | null
  commercialType: string | null
  modality: string | null
  accountManager: string | null
  nameReduced: string
}

export interface BuRowData {
  entity: string
  plan: number
  fc: number
  faturado: number
}

interface KpiData {
  planTotal: number
  fcTotal: number
  faturadoYtd: number
  atingimentoPct: number
  mbPct: number
  lastSync: Date | null
}

interface DashboardShellProps {
  kpiData: KpiData
  chartData: { month: string; plano: number; fc: number; realizado: number }[]
  clients: ClientMeta[]
  buData: BuRowData[]
  currentMonth: number
}

export function DashboardShell({ kpiData, chartData, clients, buData, currentMonth }: DashboardShellProps) {
  const router = useRouter()

  const [filters, setFilters] = useState<DashboardFilters>({
    bu: 'all', com: 'all', mod: 'all', conta: 'all', search: '',
  })

  // Dynamic KPI/Chart state — updated by server refresh or filter change
  const [dynKpi,    setDynKpi]    = useState<KpiData>(kpiData)
  const [dynChart,  setDynChart]  = useState(chartData)
  const [fetching,  setFetching]  = useState(false)

  // Hourly refresh of server data
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [router])

  // Re-fetch filtered summary whenever filters change (debounced 300ms for search)
  // Also fires on server refresh (kpiData/chartData change) to re-sync
  useEffect(() => {
    const active = filters.bu !== 'all' || filters.com !== 'all' || filters.mod !== 'all' || filters.conta !== 'all' || filters.search !== ''

    if (!active) {
      setDynKpi(kpiData)
      setDynChart(chartData)
      return
    }

    const timer = setTimeout(async () => {
      const params = new URLSearchParams()
      if (filters.bu    !== 'all') params.set('bu',    filters.bu)
      if (filters.com   !== 'all') params.set('com',   filters.com)
      if (filters.mod   !== 'all') params.set('mod',   filters.mod)
      if (filters.conta !== 'all') params.set('conta', filters.conta)
      if (filters.search)          params.set('search', filters.search)

      setFetching(true)
      try {
        const res  = await fetch(`/api/dashboard/summary?${params}`)
        const json = await res.json()
        setDynKpi({ ...json.kpis, lastSync: kpiData.lastSync })
        setDynChart(json.chartData)
      } catch { /* silent */ }
      setFetching(false)
    }, 300)

    return () => clearTimeout(timer)
  // kpiData.lastSync needs to be preserved; kpiData/chartData are included
  // so a server refresh also re-triggers filtered fetch when filters are active
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, kpiData, chartData])

  // Dropdown options from client metadata
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

  // Client count matching current filters
  const matchedCount = useMemo(() => {
    const q = filters.search.toLowerCase()
    return clients.filter(c => {
      if (filters.bu    !== 'all' && c.entity          !== filters.bu)    return false
      if (filters.com   !== 'all' && c.commercialType  !== filters.com)   return false
      if (filters.mod   !== 'all' && c.modality        !== filters.mod)   return false
      if (filters.conta !== 'all' && c.accountManager  !== filters.conta) return false
      if (q && !c.nameReduced.toLowerCase().includes(q))                  return false
      return true
    }).length
  }, [clients, filters])

  // BU rows filtered by entity selector (BuSummaryTable shows aggregate BU totals)
  const filteredBuData = useMemo(() => (
    filters.bu === 'all' ? buData : buData.filter(d => d.entity === filters.bu)
  ), [buData, filters.bu])

  const hasFilter = filters.bu !== 'all' || filters.com !== 'all' || filters.mod !== 'all' || filters.conta !== 'all' || filters.search !== ''

  const dropdowns: { label: string; key: keyof DashboardFilters; options: string[]; placeholder: string }[] = [
    { label: 'BU',         key: 'bu',    options: opts.bu,  placeholder: 'Todas as BUs'      },
    { label: 'CATEGORIA',  key: 'com',   options: opts.com, placeholder: 'Todas Categorias'  },
    { label: 'MODALIDADE', key: 'mod',   options: opts.mod, placeholder: 'Todas Modalidades' },
    { label: 'CONTA',      key: 'conta', options: opts.cnt, placeholder: 'Todas Contas'       },
  ]

  return (
    <div className="p-5 space-y-4">

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl flex items-center gap-2 px-4 py-2 flex-wrap"
        style={{
          background: '#fff',
          border: '1px solid rgba(66,44,118,0.07)',
          boxShadow: '0 1px 6px rgba(66,44,118,0.05)',
        }}
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#9a8fb5' }} />
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar cliente..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg w-44 focus:outline-none"
            style={{ background: OFFWHITE, border: '1.5px solid rgba(66,44,118,0.12)', color: GRAFITE }}
          />
        </div>

        {dropdowns.map(({ label, key, options, placeholder }) => {
          const val = filters[key]
          return (
            <div key={label} className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#b8b0ca' }}>
                {label}
              </span>
              <select
                value={val}
                onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                className="text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                style={{
                  background: val !== 'all' ? 'rgba(66,44,118,0.08)' : OFFWHITE,
                  border: '1.5px solid rgba(66,44,118,0.12)',
                  color: val !== 'all' ? LILAS : GRAFITE,
                  fontWeight: val !== 'all' ? 700 : 400,
                }}
              >
                <option value="all">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )
        })}

        {hasFilter && (
          <button
            onClick={() => setFilters({ bu: 'all', com: 'all', mod: 'all', conta: 'all', search: '' })}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
            style={{ color: MAGENTA, background: 'rgba(255,47,105,0.07)' }}
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {fetching && (
            <div className="flex items-center gap-1 text-[11px]" style={{ color: '#9a8fb5' }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Atualizando...</span>
            </div>
          )}
          <span className="text-[11px] tabular-nums font-medium" style={{ color: '#b8b0ca' }}>
            {matchedCount} clientes
          </span>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <KpiCards {...dynKpi} />

      {/* ── Gráficos + BU ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <RevenueChart data={dynChart} />
          <DailyChart filters={filters} month={currentMonth} />
        </div>
        <BuSummaryTable data={filteredBuData} />
      </div>

    </div>
  )
}
