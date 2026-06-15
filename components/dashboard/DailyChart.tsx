'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart, LabelList,
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
const LILAS   = '#422c76'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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

// Rótulo customizado para barras de faturado — exibe apenas valores > 0
function FatLabel(props: Record<string, unknown>) {
  const { x, y, width, value } = props as { x: number; y: number; width: number; value: number }
  if (!value || value === 0) return null
  const formatted = value >= 1e6
    ? `${(value / 1e6).toFixed(1)}M`
    : value >= 1e3
    ? `${Math.round(value / 1e3)}K`
    : String(Math.round(value))
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 3}
      textAnchor="middle"
      fontSize={8.5}
      fontWeight={600}
      fill="#01a86a"
    >
      {formatted}
    </text>
  )
}

export function DailyChart({ filters, month }: { filters: DashboardFilters; month: number }) {
  const [data, setData]             = useState<DayData[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedMonth, setSelected] = useState(month)

  const currentMonthNum = new Date().getMonth() + 1

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ month: String(selectedMonth) })
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
  }, [filters, selectedMonth])

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
      {/* Cabeçalho */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#414042' }}>Faturamento Diário</h3>
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#9a8fb5' }}>
            Valor faturado (R$) e processos por dia
          </p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 mt-0.5" style={{ color: '#9a8fb5' }} />}
      </div>

      {/* Seletor de mês */}
      <div className="flex flex-wrap gap-1 mb-4">
        {MONTH_NAMES.map((name, i) => {
          const m          = i + 1
          const available  = m <= currentMonthNum
          const isSelected = m === selectedMonth
          return (
            <button
              key={m}
              disabled={!available}
              onClick={() => available && setSelected(m)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
              style={{
                background: isSelected
                  ? LILAS
                  : available
                  ? 'rgba(66,44,118,0.08)'
                  : 'rgba(66,44,118,0.03)',
                color: isSelected
                  ? '#fff'
                  : available
                  ? LILAS
                  : 'rgba(66,44,118,0.25)',
                cursor: available ? 'pointer' : 'default',
                outline: 'none',
              }}
            >
              {name}
            </button>
          )
        })}
      </div>

      {!loading && data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs" style={{ color: '#9a8fb5' }}>
          Sem dados para o período selecionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={data} margin={{ top: 18, right: 48, left: -8, bottom: 0 }}>
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
              wrapperStyle={{ fontSize: '11px', paddingTop: '14px' }}
              formatter={v => <span style={{ color: '#6b6570', fontWeight: 600 }}>{v}</span>}
            />
            <Bar yAxisId="fat" dataKey="faturado" name="Faturado" fill={VERDE} radius={[3, 3, 0, 0]}>
              <LabelList content={<FatLabel />} />
            </Bar>
            <Bar yAxisId="proc" dataKey="processos" name="Processos" fill={MAGENTA} radius={[3, 3, 0, 0]} opacity={0.75} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
