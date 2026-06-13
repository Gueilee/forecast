'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { formatMillions } from '@/lib/utils'

interface DayData {
  day: number
  label: string
  faturado: number
  processos: number
}

export interface DashboardFilters {
  bu: string
  com: string
  mod: string
  conta: string
  search: string
}

const VERDE   = '#01E18E'
const MAGENTA = '#ff2f69'

function DailyTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl shadow-xl px-4 py-3 text-xs"
      style={{ background: '#fff', border: '1px solid rgba(66,44,118,0.12)', boxShadow: '0 8px 32px rgba(66,44,118,0.15)' }}
    >
      <p className="font-bold mb-2 text-sm" style={{ color: '#414042' }}>Dia {label}</p>
      {payload.map(e => (
        <div key={e.name} className="flex items-center gap-2 mb-1.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
          <span style={{ color: '#6b6570' }}>{e.name}:</span>
          <span className="font-bold ml-1" style={{ color: e.color }}>
            {e.name === 'Faturado' ? formatMillions(Number(e.value)) : `${e.value} proc.`}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DailyChart({ filters, month }: { filters: DashboardFilters; month: number }) {
  const [data, setData]       = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ month: String(month) })
    if (filters.bu    !== 'all') params.set('bu',    filters.bu)
    if (filters.com   !== 'all') params.set('com',   filters.com)
    if (filters.mod   !== 'all') params.set('mod',   filters.mod)
    if (filters.conta !== 'all') params.set('conta', filters.conta)
    if (filters.search)          params.set('search', filters.search)

    try {
      const res  = await fetch(`/api/dashboard/daily?${params}`)
      const json = await res.json()
      setData(json.days ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }, [filters, month])

  useEffect(() => {
    setLoading(true)
    fetchData()
    const id = setInterval(fetchData, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchData])

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#fff', border: '1px solid rgba(66,44,118,0.08)', boxShadow: '0 2px 12px rgba(66,44,118,0.06)' }}
    >
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#414042' }}>Faturamento Diário</h3>
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#9a8fb5' }}>
            Valor faturado (R$) e processos por dia · mês corrente
          </p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 mt-0.5" style={{ color: '#9a8fb5' }} />}
      </div>

      {!loading && data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs" style={{ color: '#9a8fb5' }}>
          Sem dados para o período selecionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={248}>
          <ComposedChart data={data} margin={{ top: 4, right: 48, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,44,118,0.07)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#9a8fb5', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="fat"
              tick={{ fontSize: 11, fill: '#9a8fb5' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v)}
            />
            <YAxis
              yAxisId="proc"
              orientation="right"
              tick={{ fontSize: 11, fill: '#9a8fb5' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<DailyTooltip />} cursor={{ fill: 'rgba(66,44,118,0.04)' }} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
              formatter={v => <span style={{ color: '#6b6570', fontWeight: 600 }}>{v}</span>}
            />
            <Bar yAxisId="fat"  dataKey="faturado"  name="Faturado"   fill={VERDE}   radius={[4, 4, 0, 0]} />
            <Bar yAxisId="proc" dataKey="processos" name="Processos"  fill={MAGENTA} radius={[4, 4, 0, 0]} opacity={0.75} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
