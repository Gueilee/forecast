/**
 * Daemon de sync — roda dentro do container Docker
 * Executa sync-nf.cjs no horário configurado via SYNC_HOURS
 *
 * Variáveis de ambiente:
 *   SYNC_HOURS   Horas de execução, separadas por vírgula. Padrão: "6,18"
 *   SYNC_YEAR    Ano a sincronizar. Padrão: ano atual
 */

const { execSync } = require('child_process')
const path = require('path')

const SYNC_HOURS = (process.env.SYNC_HOURS || '6,18')
  .split(',')
  .map(h => parseInt(h.trim(), 10))
  .filter(h => !isNaN(h))

const scriptPath = path.join(__dirname, 'sync-nf.cjs')

console.log(`[sync-daemon] Iniciado em ${new Date().toISOString()}`)
console.log(`[sync-daemon] Horários configurados: ${SYNC_HOURS.map(h => `${h}h`).join(', ')}`)

const ranAt = new Set()

function stamp() {
  return new Date().toISOString()
}

function runSync() {
  const year = process.env.SYNC_YEAR || new Date().getFullYear()
  console.log(`\n[sync-daemon] ${stamp()} — Iniciando sync ${year}...`)
  try {
    execSync(`node "${scriptPath}" ${year}`, { stdio: 'inherit' })
    console.log(`[sync-daemon] ${stamp()} — Sync concluído com sucesso`)
  } catch (err) {
    console.error(`[sync-daemon] ${stamp()} — Sync falhou: ${err.message}`)
  }
}

// Executa imediatamente ao iniciar o container
runSync()

// Verifica a cada 5 minutos se é hora de executar
setInterval(() => {
  const now   = new Date()
  const hour  = now.getHours()
  const key   = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hour}`

  if (SYNC_HOURS.includes(hour) && !ranAt.has(key)) {
    ranAt.add(key)
    // Limpa chaves antigas (guarda só as últimas 48h)
    if (ranAt.size > 48) {
      const oldest = Array.from(ranAt)[0]
      ranAt.delete(oldest)
    }
    runSync()
  }
}, 5 * 60 * 1000)

console.log('[sync-daemon] Aguardando próxima execução programada...\n')
