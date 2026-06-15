'use client'

import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'

interface ChartDataPoint {
  month: string
  plano: number
  fc: number
  realizado: number
}

const LILAS = '#422c76'
const MAGENTA = '#ff2f69'
const VERDE = '#01E18E'

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl shadow-xl px-4 py-3 text-xs"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(66,44,118,0.12)',
          boxShadow: '0 8px 32px rgba(66,44,118,0.15)',
        }}
      >
        <p className="font-bold mb-2.5 text-sm" style={{ color: '#414042' }}>
          {label}
        </p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2.5 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span style={{ color: '#6b6570' }}>{entry.name}:</span>
            <span className="font-bold ml-auto" style={{ color: entry.color }}>
              R$ {entry.value.toFixed(1)}M
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(66,44,118,0.08)',
        boxShadow: '0 2px 12px rgba(66,44,118,0.06)',
      }}
    >
      <div className="mb-5">
        <h3 className="text-sm font-bold" style={{ color: '#414042' }}>
          Plano vs Realizado
        </h3>
        <p className="text-xs mt-0.5 font-medium" style={{ color: '#9a8fb5' }}>
          Faturamento mensal em R$ Milhões · 2026
        </p>
      </div>

      <ResponsiveContainer width="100%" height={248}>
        <ComposedChart data={data} margin={{ top: 22, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,44,118,0.07)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#9a8fb5', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9a8fb5' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}M`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(66,44,118,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
            formatter={(value) => (
              <span style={{ color: '#6b6570', fontWeight: 600 }}>{value}</span>
            )}
          />
          <Bar dataKey="plano" name="Plano" fill={LILAS} opacity={0.18} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="plano"
              position="top"
              formatter={(v) => Number(v) > 0 ? `${v}M` : ''}
              style={{ fontSize: 9, fill: 'rgba(66,44,118,0.45)', fontWeight: 600 }}
            />
          </Bar>
          <Bar dataKey="realizado" name="Realizado" fill={VERDE} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="realizado"
              position="top"
              formatter={(v) => Number(v) > 0 ? `${v}M` : ''}
              style={{ fontSize: 9, fill: '#01c07a', fontWeight: 700 }}
            />
          </Bar>
          <Line
            type="monotone"
            dataKey="fc"
            name="FC"
            stroke={MAGENTA}
            strokeWidth={2.5}
            dot={{ fill: MAGENTA, r: 3.5, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: MAGENTA }}
            strokeDasharray="5 3"
          >
            <LabelList
              dataKey="fc"
              position="top"
              formatter={(v) => Number(v) > 0 ? `${v}M` : ''}
              style={{ fontSize: 9, fill: MAGENTA, fontWeight: 700 }}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

interface RevenueChartProps {
  data: ChartDataPoint[]
}
