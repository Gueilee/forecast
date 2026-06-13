import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { MONTHS } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const YEAR = 2026

export async function GET(request: NextRequest) {
  const CURRENT_MONTH = new Date().getMonth() + 1

  const sp     = request.nextUrl.searchParams
  const bu     = sp.get('bu')     ?? 'all'
  const com    = sp.get('com')    ?? 'all'
  const mod    = sp.get('mod')    ?? 'all'
  const conta  = sp.get('conta')  ?? 'all'
  const search = sp.get('search') ?? ''

  // ── Filtro de clientes ────────────────────────────────────────────────
  const clientWhere: Prisma.ClientWhereInput = { isActive: true }
  if (bu    !== 'all') clientWhere.entity          = bu
  if (com   !== 'all') clientWhere.commercialType  = com
  if (mod   !== 'all') clientWhere.modality        = mod
  if (conta !== 'all') clientWhere.accountManager  = conta
  if (search)          clientWhere.nameReduced     = { contains: search }

  const matched   = await db.client.findMany({ where: clientWhere, select: { id: true } })
  const clientIds = matched.map(c => c.id)

  if (clientIds.length === 0) {
    const empty = Array.from({ length: 12 }, (_, i) => ({
      month: MONTHS[i].substring(0, 3), plano: 0, fc: 0, realizado: 0,
    }))
    return Response.json({ kpis: { planTotal: 0, fcTotal: 0, faturadoYtd: 0, atingimentoPct: 0, mbPct: 0 }, chartData: empty })
  }

  // Spread `{ clientId: { in: clientIds } }` to avoid nullable type issues
  const byClient = { clientId: { in: clientIds } }

  const [budgetTotals, actualYtd, planYtdAgg, monthlyBudget, monthlyActual] = await Promise.all([
    db.budgetEntry.aggregate({
      where: { year: YEAR, ...byClient },
      _sum: { plan: true, fcMonth: true },
    }),
    db.actualNF.aggregate({
      where: { year: YEAR, month: { lte: CURRENT_MONTH }, scope: 'SAÍDA', ...byClient },
      _sum: { totNet: true },
    }),
    db.budgetEntry.aggregate({
      where: { year: YEAR, month: { lte: CURRENT_MONTH }, ...byClient },
      _sum: { plan: true },
    }),
    db.budgetEntry.groupBy({
      by: ['month'],
      where: { year: YEAR, ...byClient },
      _sum: { plan: true, fcMonth: true },
      orderBy: { month: 'asc' },
    }),
    db.actualNF.groupBy({
      by: ['month'],
      where: { year: YEAR, scope: 'SAÍDA', ...byClient },
      _sum: { totNet: true },
      orderBy: { month: 'asc' },
    }),
  ])

  const planTotal      = budgetTotals._sum.plan    ?? 0
  const fcTotal        = budgetTotals._sum.fcMonth ?? planTotal
  const faturadoYtd    = actualYtd._sum.totNet     ?? 0
  const planYtdValue   = planYtdAgg._sum.plan      ?? 0
  const atingimentoPct = planYtdValue > 0 ? (faturadoYtd / planYtdValue) * 100 : 0

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m      = i + 1
    const budget = monthlyBudget.find(b => b.month === m)
    const actual = monthlyActual.find(a => a.month === m)
    return {
      month:     MONTHS[i].substring(0, 3),
      plano:     Math.round((budget?._sum.plan    ?? 0) / 1_000_000 * 10) / 10,
      fc:        Math.round((budget?._sum.fcMonth ?? budget?._sum.plan ?? 0) / 1_000_000 * 10) / 10,
      realizado: Math.round((actual?._sum.totNet  ?? 0) / 1_000_000 * 10) / 10,
    }
  })

  return Response.json({ kpis: { planTotal, fcTotal, faturadoYtd, atingimentoPct, mbPct: 0 }, chartData })
}
