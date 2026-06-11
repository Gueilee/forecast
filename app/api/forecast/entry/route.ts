import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const EDITABLE_FIELDS = new Set(['fcMonth', 'orders', 'lastWeek', 'mbPlanPct', 'mbFcPct'])

// FC e PEDIDO ficam bloqueados após quinta-feira às 22h até próxima segunda
function isFcLocked(): boolean {
  const now = new Date()
  const day = now.getDay() // 0=Dom, 1=Seg, ..., 4=Qui, 5=Sex, 6=Sáb
  const hour = now.getHours()
  if (day === 4 && hour >= 22) return true
  if (day === 5 || day === 6 || day === 0) return true
  return false
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const { clientId, year, month, field, value } = body as {
    clientId: string
    year: number
    month: number
    field: string
    value: number | null
  }

  if (!clientId || !year || !month || !field) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: clientId, year, month, field' }, { status: 400 })
  }
  if (!EDITABLE_FIELDS.has(field)) {
    return NextResponse.json({ error: `Campo '${field}' não editável` }, { status: 400 })
  }

  const locked = isFcLocked()
  if (locked && (field === 'fcMonth' || field === 'orders')) {
    return NextResponse.json(
      { error: 'FC e Pedido ficam bloqueados após quinta-feira 22h. Edição liberada na segunda-feira.' },
      { status: 403 }
    )
  }

  // Garante que a entrada existe (cria se não existir)
  const entry = await db.budgetEntry.findUnique({
    where: { clientId_year_month: { clientId, year, month } },
  })

  if (!entry) {
    await db.budgetEntry.create({
      data: { clientId, year, month, plan: 0, [field]: value },
    })
  } else {
    await db.budgetEntry.update({
      where: { clientId_year_month: { clientId, year, month } },
      data: { [field]: value },
    })
  }

  // Registra a revisão para auditoria
  if (value != null) {
    await db.forecastRevision.create({
      data: {
        clientId,
        year,
        month,
        field,
        oldValue: entry ? (entry[field as keyof typeof entry] as number | null) ?? null : null,
        newValue: value,
        comment: '',
        userId: (session.user as { id: string }).id,
      },
    })
  }

  return NextResponse.json({ ok: true })
}

// GET: retorna a entrada de forecast de um cliente/mês
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))

  if (!clientId || !year || !month) {
    return NextResponse.json({ error: 'Parâmetros: clientId, year, month' }, { status: 400 })
  }

  const entry = await db.budgetEntry.findUnique({
    where: { clientId_year_month: { clientId, year, month } },
  })

  return NextResponse.json(entry ?? null)
}
