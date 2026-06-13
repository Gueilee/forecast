import { db } from '@/lib/db'
import { Header } from '@/components/layout/Header'
import { ManualFaturadoGrid, ManualClientsInfo } from '@/components/forecast/ManualFaturadoGrid'
import { PencilLine, Info } from 'lucide-react'

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

  // Calcula total YTD faturado dos clientes manuais
  const ytd = clients.reduce((sum, c) =>
    sum + c.budgetEntries.reduce((s, e) => s + (e.faturado ?? 0), 0), 0
  )

  return (
    <div>
      <Header
        title="Lançamento Manual de Faturado"
        subtitle={`${clients.length} clientes · Faturado manual não integrado à API Conexos`}
      />

      <div className="p-6 space-y-6">

        {/* ── Cards de contexto ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
              <PencilLine className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
              <p className="text-xs text-zinc-500">Clientes manuais</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center">
              <span className="text-emerald-400 text-xs font-bold">R$</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {(ytd / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M
              </p>
              <p className="text-xs text-zinc-500">Total faturado {YEAR}</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-300">Clientes sem integração Conexos</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Esses clientes não emitem NFs pelo Conexos. Lance o faturado mensalmente nesta tela.
              </p>
            </div>
          </div>
        </div>

        {/* ── Cards de clientes ── */}
        <ManualClientsInfo clients={clients} />

        {/* ── Instrução ── */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/40 border border-white/5 rounded-lg px-4 py-2.5">
          <PencilLine className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          Edite os valores diretamente nas células e clique em <strong className="text-zinc-400 mx-1">Salvar</strong> na linha do cliente para confirmar.
          Os dados se refletem imediatamente no Dashboard e na Forecast Matrix.
        </div>

        {/* ── Grid principal ── */}
        <ManualFaturadoGrid clients={clients} />

      </div>
    </div>
  )
}
