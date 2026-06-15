import { db } from '@/lib/db'
import { Header } from '@/components/layout/Header'
import { ManualFaturadoGrid, ManualClientsInfo } from '@/components/forecast/ManualFaturadoGrid'
import { PencilLine, Info, TrendingUp } from 'lucide-react'

const YEAR = 2026

async function getManualClients() {
  return db.client.findMany({
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
}

export default async function FaturadoManualPage() {
  const clients = await getManualClients()

  const ytd = clients.reduce(
    (sum, c) => sum + c.budgetEntries.reduce((s, e) => s + (e.faturado ?? 0), 0),
    0,
  )

  const ytdFmt =
    ytd >= 1_000_000
      ? `R$ ${(ytd / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
      : `R$ ${ytd.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

  return (
    <div>
      <Header
        title="Lançamento Manual de Faturado"
        subtitle={`${clients.length} clientes · Faturado manual não integrado à API Conexos`}
      />

      <div className="p-6 space-y-5">

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              background: '#fff',
              border: '1px solid rgba(66,44,118,0.08)',
              boxShadow: '0 2px 12px rgba(66,44,118,0.06)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(66,44,118,0.08)' }}
            >
              <PencilLine className="w-5 h-5" style={{ color: '#422c76' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#414042' }}>
                {clients.length}
              </p>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#9a8fb5' }}>
                Clientes manuais
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              background: '#fff',
              border: '1px solid rgba(66,44,118,0.08)',
              boxShadow: '0 2px 12px rgba(66,44,118,0.06)',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(1,225,142,0.1)' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: '#01c07a' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#414042' }}>
                {ytdFmt}
              </p>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#9a8fb5' }}>
                Total faturado {YEAR}
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl p-5 flex items-start gap-3"
            style={{
              background: 'rgba(66,44,118,0.03)',
              border: '1px solid rgba(66,44,118,0.1)',
              boxShadow: '0 2px 12px rgba(66,44,118,0.04)',
            }}
          >
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#422c76' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#422c76' }}>
                Clientes sem integração Conexos
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6b6570' }}>
                Esses clientes não emitem NFs pelo Conexos. Lance o faturado mensalmente
                nesta tela.
              </p>
            </div>
          </div>

        </div>

        {/* Client chips */}
        <ManualClientsInfo clients={clients} />

        {/* Instruction banner */}
        <div
          className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs"
          style={{
            background: 'rgba(66,44,118,0.03)',
            border: '1px solid rgba(66,44,118,0.08)',
            color: '#6b6570',
          }}
        >
          <PencilLine className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#422c76' }} />
          <span>
            Edite as células — use{' '}
            <strong style={{ color: '#422c76' }}>1,25M</strong> para R$ 1.250.000 ou{' '}
            <strong style={{ color: '#422c76' }}>750K</strong> para R$ 750.000. Clique em{' '}
            <strong style={{ color: '#422c76' }}>Salvar</strong> para confirmar linha por linha.
          </span>
        </div>

        {/* Grid */}
        <ManualFaturadoGrid clients={clients} />

      </div>
    </div>
  )
}
