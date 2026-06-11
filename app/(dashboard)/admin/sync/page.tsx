'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { RefreshCw, Play, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface SyncJob {
  id: string
  status: string
  recordsTotal: number
  recordsNew: number
  recordsUpdated: number
  errors: string | null
  startedAt: string
  finishedAt: string | null
  triggeredBy: string | null
}

const MONTHS = [
  { value: '', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'DONE') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: 'rgba(13,109,56,0.1)', color: '#0d6d38' }}>
      <CheckCircle2 className="w-3 h-3" /> Concluído
    </span>
  )
  if (status === 'RUNNING') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: 'rgba(66,44,118,0.1)', color: '#422c76' }}>
      <Loader2 className="w-3 h-3 animate-spin" /> Em execução
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: 'rgba(255,47,105,0.1)', color: '#ff2f69' }}>
      <AlertCircle className="w-3 h-3" /> Erro
    </span>
  )
}

function duration(start: string, end: string | null): string {
  if (!end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SyncPage() {
  const currentYear = new Date().getFullYear()

  const [jobs, setJobs]         = useState<SyncJob[]>([])
  const [loading, setLoading]   = useState(true)
  const [year, setYear]         = useState(String(currentYear))
  const [month, setMonth]       = useState('')
  const [triggering, setTriggering] = useState(false)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sync/jobs')
      if (res.ok) setJobs(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Auto-refresh enquanto houver job RUNNING
  useEffect(() => {
    const hasRunning = jobs.some(j => j.status === 'RUNNING')
    if (!hasRunning) return
    const id = setInterval(fetchJobs, 4000)
    return () => clearInterval(id)
  }, [jobs, fetchJobs])

  async function triggerSync() {
    setTriggering(true)
    try {
      const res = await fetch('/api/admin/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: year || null, month: month || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao iniciar sync')
        return
      }
      toast.success(data.message)
      // Aguarda 2s para o job aparecer no DB antes de recarregar
      setTimeout(fetchJobs, 2000)
    } catch {
      toast.error('Erro de conexão ao iniciar sync')
    } finally {
      setTriggering(false)
    }
  }

  const lastJob = jobs[0]
  const hasRunning = jobs.some(j => j.status === 'RUNNING')

  return (
    <div>
      <Header
        title="Sincronização Conexos"
        subtitle="Atualização de dados do Oracle para o banco de produção"
        actions={
          <button
            onClick={fetchJobs}
            title="Atualizar lista"
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
            style={{ color: '#9a8fb5' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f3f0f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <RefreshCw className={`w-4 h-4 ${hasRunning ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="p-6 space-y-6 max-w-5xl">

        {/* Cards de status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid rgba(66,44,118,0.1)', boxShadow: '0 2px 12px rgba(66,44,118,0.06)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(66,44,118,0.4)' }}>Último Sync</p>
            {lastJob ? (
              <>
                <StatusBadge status={lastJob.status} />
                <p className="text-xs mt-2" style={{ color: '#9a8fb5' }}>{formatDate(lastJob.startedAt)}</p>
              </>
            ) : (
              <p className="text-sm" style={{ color: '#9a8fb5' }}>Nenhum registro</p>
            )}
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid rgba(66,44,118,0.1)', boxShadow: '0 2px 12px rgba(66,44,118,0.06)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(66,44,118,0.4)' }}>Registros (último job)</p>
            {lastJob ? (
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-2xl font-black" style={{ color: '#422c76' }}>{lastJob.recordsNew.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px]" style={{ color: '#9a8fb5' }}>novas NFs</p>
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ color: '#414042' }}>{lastJob.recordsUpdated.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px]" style={{ color: '#9a8fb5' }}>atualizadas</p>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#9a8fb5' }}>—</p>
            )}
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid rgba(66,44,118,0.1)', boxShadow: '0 2px 12px rgba(66,44,118,0.06)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(66,44,118,0.4)' }}>Automático</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4" style={{ color: '#422c76' }} />
              <p className="text-sm font-semibold" style={{ color: '#414042' }}>08h–21h (de hora em hora)</p>
            </div>
            <p className="text-xs mt-1" style={{ color: '#9a8fb5' }}>Horário de Brasília</p>
          </div>
        </div>

        {/* Trigger manual */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(66,44,118,0.1)', boxShadow: '0 2px 12px rgba(66,44,118,0.06)' }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: '#414042' }}>Sincronização Manual</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold block" style={{ color: '#414042' }}>Ano</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                min={2024}
                max={currentYear + 1}
                className="w-28 px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ background: '#faf9f5', border: '1.5px solid rgba(66,44,118,0.18)', color: '#414042' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#422c76')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(66,44,118,0.18)')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold block" style={{ color: '#414042' }}>Mês</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-44 px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ background: '#faf9f5', border: '1.5px solid rgba(66,44,118,0.18)', color: '#414042' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#422c76')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(66,44,118,0.18)')}
              >
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <button
              onClick={triggerSync}
              disabled={triggering || hasRunning}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #422c76 0%, #ff2f69 100%)',
                boxShadow: '0 4px 16px rgba(255,47,105,0.3)',
              }}
            >
              {triggering
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
                : hasRunning
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sync em andamento</>
                  : <><Play className="w-4 h-4" /> Sincronizar</>
              }
            </button>
          </div>

          {hasRunning && (
            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: '#422c76' }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Sincronização em andamento — atualizando automaticamente...
            </div>
          )}
        </div>

        {/* Histórico de jobs */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(66,44,118,0.1)', boxShadow: '0 2px 12px rgba(66,44,118,0.06)' }}>
          <div className="px-5 py-4" style={{ background: '#fff', borderBottom: '1px solid rgba(66,44,118,0.08)' }}>
            <h2 className="text-sm font-bold" style={{ color: '#414042' }}>Histórico de Jobs</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9a8fb5' }}>Últimas 30 execuções</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2" style={{ background: '#fff' }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#422c76' }} />
              <span className="text-sm" style={{ color: '#9a8fb5' }}>Carregando...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12" style={{ background: '#fff' }}>
              <RefreshCw className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(66,44,118,0.2)' }} />
              <p className="text-sm" style={{ color: '#9a8fb5' }}>Nenhum job registrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ background: '#fff' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(66,44,118,0.08)' }}>
                    {['Job ID', 'Status', 'Acionado por', 'Início', 'Duração', 'Novas', 'Atualizadas'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold"
                        style={{ color: 'rgba(66,44,118,0.5)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => (
                    <tr key={job.id}
                      style={{
                        borderBottom: i < jobs.length - 1 ? '1px solid rgba(66,44,118,0.06)' : 'none',
                        background: job.status === 'RUNNING' ? 'rgba(66,44,118,0.02)' : 'transparent',
                      }}
                    >
                      <td className="px-4 py-3 font-mono" style={{ color: '#9a8fb5' }}>
                        {job.id.substring(0, 10)}...
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                      <td className="px-4 py-3" style={{ color: '#414042' }}>
                        {job.triggeredBy ?? 'DAEMON'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#414042' }}>
                        {formatDate(job.startedAt)}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#414042' }}>
                        {duration(job.startedAt, job.finishedAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#0d6d38' }}>
                        {job.recordsNew.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#414042' }}>
                        {job.recordsUpdated.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
