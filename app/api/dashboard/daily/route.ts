import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

const YEAR = 2026

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const month   = parseInt(sp.get('month')  ?? String(new Date().getMonth() + 1))
  const bu      = sp.get('bu')    ?? 'all'
  const com     = sp.get('com')   ?? 'all'
  const mod     = sp.get('mod')   ?? 'all'
  const conta   = sp.get('conta') ?? 'all'
  const search  = sp.get('search') ?? ''

  // Build optional clientId filter
  const hasFilter = bu !== 'all' || com !== 'all' || mod !== 'all' || conta !== 'all' || search !== ''
  let clientIds: string[] | undefined

  if (hasFilter) {
    const where: Prisma.ClientWhereInput = { isActive: true }
    if (bu    !== 'all') where.entity          = bu
    if (com   !== 'all') where.commercialType  = com
    if (mod   !== 'all') where.modality        = mod
    if (conta !== 'all') where.accountManager  = conta
    if (search)          where.nameReduced     = { contains: search }

    const matched = await db.client.findMany({ where, select: { id: true } })
    clientIds = matched.map(c => c.id)
    if (clientIds.length === 0) return Response.json({ days: [] })
  }

  const nfs = await db.actualNF.findMany({
    where: {
      year: YEAR,
      month,
      scope: 'SAÍDA',
      ...(clientIds ? { clientId: { in: clientIds } } : {}),
    },
    select: { emissionDate: true, totNet: true, refCliente: true },
  })

  // Group by calendar day
  const byDay = new Map<string, { faturado: number; refs: Set<string> }>()
  for (const nf of nfs) {
    const day = new Date(nf.emissionDate).toISOString().slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, { faturado: 0, refs: new Set() })
    const entry = byDay.get(day)!
    entry.faturado += nf.totNet
    if (nf.refCliente) entry.refs.add(nf.refCliente)
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, { faturado, refs }]) => ({
      day: parseInt(iso.split('-')[2]),
      label: iso.slice(8, 10) + '/' + iso.slice(5, 7),
      faturado: Math.round(faturado),
      processos: refs.size,
    }))

  return Response.json({ days })
}
