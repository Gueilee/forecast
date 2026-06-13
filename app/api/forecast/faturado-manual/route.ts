import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const YEAR = 2026

// GET — carrega clientes manuais com seus valores de faturado por mês
export async function GET() {
  const clients = await db.client.findMany({
    where: { isManual: true, isActive: true },
    select: {
      id: true,
      nameReduced: true,
      nameChart: true,
      entity: true,
      accountManager: true,
      budgetEntries: {
        where: { year: YEAR },
        select: { month: true, faturado: true, plan: true },
        orderBy: { month: 'asc' },
      },
    },
    orderBy: { nameReduced: 'asc' },
  })

  return Response.json(clients)
}

// PATCH — atualiza faturado de um mês para um cliente manual
// Body: { clientId: string, month: number, faturado: number }
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body = await request.json()
  const { clientId, month, faturado } = body as { clientId: string; month: number; faturado: number }

  if (!clientId || !month || month < 1 || month > 12 || faturado == null) {
    return new Response('Dados inválidos', { status: 400 })
  }

  // Verifica se é realmente cliente manual
  const client = await db.client.findUnique({ where: { id: clientId }, select: { isManual: true } })
  if (!client?.isManual) return new Response('Cliente não é manual', { status: 403 })

  const entry = await db.budgetEntry.upsert({
    where: { clientId_year_month: { clientId, year: YEAR, month } },
    update: { faturado },
    create: { clientId, year: YEAR, month, plan: 0, faturado },
    select: { faturado: true, month: true },
  })

  return Response.json(entry)
}

// POST — atualiza todos os meses de um cliente de uma vez
// Body: { clientId: string, months: Record<number, number> }
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body = await request.json()
  const { clientId, months } = body as { clientId: string; months: Record<number, number> }

  if (!clientId || !months) return new Response('Dados inválidos', { status: 400 })

  const client = await db.client.findUnique({ where: { id: clientId }, select: { isManual: true } })
  if (!client?.isManual) return new Response('Cliente não é manual', { status: 403 })

  const updates = await Promise.all(
    Object.entries(months).map(([m, fat]) => {
      const month = Number(m)
      return db.budgetEntry.upsert({
        where: { clientId_year_month: { clientId, year: YEAR, month } },
        update: { faturado: fat },
        create: { clientId, year: YEAR, month, plan: 0, faturado: fat },
        select: { month: true, faturado: true },
      })
    })
  )

  return Response.json({ saved: updates.length })
}
