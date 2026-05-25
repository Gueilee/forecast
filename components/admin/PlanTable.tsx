'use client'

import { useState } from 'react'
import { formatCurrency, MONTH_SHORT } from '@/lib/utils'
import { Search } from 'lucide-react'

interface BudgetEntry {
  month: number
  plan: number
  fcMonth: number | null
}

interface Client {
  id: string
  nameReduced: string
  name: string
  entity: string | null
  accountManager: string | null
  commercialType: string | null
  modality: string | null
  budgetEntries: BudgetEntry[]
}

interface PlanTableProps {
  clients: Client[]
}

const LILAS = '#422c76'
const MAGENTA = '#ff2f69'
const VERDE = '#01E18E'
const GRAFITE = '#414042'
const OFFWHITE = '#faf9f5'

const ENTITY_CFG: Record<string, { color: string; bg: string }> = {
  'VCI':       { color: LILAS,    bg: 'rgba(66,44,118,0.1)' },
  'ARM - GRV': { color: MAGENTA,  bg: 'rgba(255,47,105,0.1)' },
  'ARM - ITV': { color: '#00b870',bg: 'rgba(1,225,142,0.1)' },
  'ARM - NVG': { color: '#d97706',bg: 'rgba(245,158,11,0.1)' },
  'TRP':       { color: GRAFITE,  bg: 'rgba(65,64,66,0.08)' },
}

export function PlanTable({ clients }: PlanTableProps) {
  const [search, setSearch] = useState('')
  const [filterEntity, setFilterEntity] = useState('all')

  const entities = Array.from(new Set(clients.map(c => c.entity).filter(Boolean))) as string[]

  const filtered = clients.filter((c) => {
    const matchSearch = !search ||
      c.nameReduced.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
    const matchEntity = filterEntity === 'all' || c.entity === filterEntity
    return matchSearch && matchEntity
  })

  const totalPlan = filtered.reduce((acc, c) =>
    acc + c.budgetEntries.reduce((s, e) => s + e.plan, 0), 0
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: '#9a8fb5' }}
          />
          <input
            placeholder="Buscar cliente..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 transition-all"
            style={{
              background: '#fff',
              border: '1.5px solid rgba(66,44,118,0.15)',
              color: GRAFITE,
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterEntity('all')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: filterEntity === 'all' ? LILAS : OFFWHITE,
              color: filterEntity === 'all' ? '#fff' : '#6b6570',
              border: `1.5px solid ${filterEntity === 'all' ? LILAS : 'rgba(66,44,118,0.15)'}`,
            }}
          >
            Todos ({clients.length})
          </button>
          {entities.map((e) => {
            const cfg = ENTITY_CFG[e] ?? { color: LILAS, bg: 'rgba(66,44,118,0.1)' }
            const active = filterEntity === e
            return (
              <button
                key={e}
                onClick={() => setFilterEntity(e)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: active ? cfg.color : OFFWHITE,
                  color: active ? '#fff' : cfg.color,
                  border: `1.5px solid ${active ? cfg.color : `${cfg.color}40`}`,
                }}
              >
                {e.replace('ARM - ', '')} ({clients.filter(c => c.entity === e).length})
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary banner */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(66,44,118,0.06)',
          border: `1.5px solid rgba(66,44,118,0.15)`,
          borderLeft: `4px solid ${LILAS}`,
        }}
      >
        <span className="text-sm font-semibold" style={{ color: LILAS }}>
          {filtered.length} linhas · Total Plano Anual 2026
        </span>
        <span className="text-lg font-extrabold" style={{ color: LILAS }}>
          {formatCurrency(totalPlan)}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          border: '1px solid rgba(66,44,118,0.1)',
          boxShadow: '0 2px 12px rgba(66,44,118,0.06)',
          position: 'relative',
        }}
      >
        {/* Fade-right indicator: signals there is more content to scroll */}
        <div
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '60px',
            background: 'linear-gradient(to right, transparent, rgba(250,249,245,0.95))',
            pointerEvents: 'none', zIndex: 20, borderRadius: '0 16px 16px 0',
          }}
        />
        <div
          className="overflow-x-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#c4b9de #f0eef8' }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: LILAS }}>
                <th
                  className="sticky left-0 z-10 text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide min-w-48"
                  style={{ background: LILAS, color: 'rgba(255,255,255,0.6)' }}
                >
                  Cliente
                </th>
                <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wide min-w-24" style={{ color: 'rgba(255,255,255,0.6)' }}>BU</th>
                <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wide min-w-28" style={{ color: 'rgba(255,255,255,0.6)' }}>Account</th>
                {MONTH_SHORT.map((m) => (
                  <th
                    key={m}
                    className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wide min-w-28"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {m}
                  </th>
                ))}
                <th
                  className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wide min-w-32"
                  style={{ color: '#fff', background: MAGENTA }}
                >
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, idx) => {
                const yearTotal = client.budgetEntries.reduce((s, e) => s + e.plan, 0)
                const cfg = ENTITY_CFG[client.entity ?? ''] ?? { color: LILAS, bg: 'rgba(66,44,118,0.08)' }
                const isEven = idx % 2 === 0

                return (
                  <tr
                    key={client.id}
                    className="transition-colors"
                    style={{
                      background: isEven ? '#fff' : OFFWHITE,
                      borderBottom: '1px solid rgba(66,44,118,0.05)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(66,44,118,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isEven ? '#fff' : OFFWHITE)}
                  >
                    <td
                      className="sticky left-0 z-10 px-4 py-2.5"
                      style={{ background: 'inherit' }}
                    >
                      <div
                        className="font-semibold truncate max-w-44 text-[11px]"
                        style={{ color: GRAFITE }}
                      >
                        {client.nameReduced}
                      </div>
                      <div
                        className="truncate max-w-44 text-[10px] mt-0.5"
                        style={{ color: '#b8b0ca' }}
                      >
                        {client.modality}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {(client.entity ?? '—').replace('ARM - ', '')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px]" style={{ color: '#6b6570' }}>
                      {client.accountManager ?? '—'}
                    </td>
                    {MONTH_SHORT.map((_, idx2) => {
                      const entry = client.budgetEntries.find(e => e.month === idx2 + 1)
                      const val = entry?.plan ?? 0
                      return (
                        <td
                          key={idx2}
                          className="px-3 py-2.5 text-right tabular-nums text-[11px]"
                          style={{ color: val > 0 ? GRAFITE : 'rgba(65,64,66,0.2)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {val > 0 ? formatCurrency(val) : '—'}
                        </td>
                      )
                    })}
                    <td
                      className="px-4 py-2.5 text-right tabular-nums font-bold text-[11px]"
                      style={{
                        color: LILAS,
                        background: 'rgba(66,44,118,0.04)',
                        borderLeft: `2px solid rgba(66,44,118,0.15)`,
                      }}
                    >
                      {formatCurrency(yearTotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
