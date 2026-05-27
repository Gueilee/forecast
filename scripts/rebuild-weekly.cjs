/**
 * Limpa ActualWeekly e recalcula a partir dos ActualNF (SAÍDA apenas)
 * Executa após corrigir o bug de ENTRADA sendo somada como faturamento
 */

const { createClient } = require('@libsql/client')
const { randomUUID } = require('crypto')
const createId = () => randomUUID().replace(/-/g, '').substring(0, 25)

const TURSO_URL   = process.env.TURSO_URL   || process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Erro: TURSO_URL e TURSO_TOKEN precisam estar definidos no ambiente.')
  process.exit(1)
}

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

function fmt(n) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

async function main() {
  console.log('=== REBUILD ActualWeekly (apenas SAÍDA) ===\n')

  // 1. Limpar ActualWeekly existente
  const { rowsAffected: deleted } = await turso.execute(`DELETE FROM "ActualWeekly"`)
  console.log(`Deletados ${deleted} registros de ActualWeekly`)

  // 2. Agregar ActualNF SAÍDA por clientId+year+month+weekOfMonth
  const { rows } = await turso.execute(`
    SELECT clientId, year, month, weekOfMonth,
           SUM(totNet)     as totFaturado,
           SUM(totProduct) as totProduct,
           SUM(icms)       as icms,
           SUM(pis)        as pis,
           SUM(cofins)     as cofins,
           SUM(ipi)        as ipi
    FROM "ActualNF"
    WHERE clientId IS NOT NULL
      AND scope = 'SAÍDA'
    GROUP BY clientId, year, month, weekOfMonth
    ORDER BY year, month, weekOfMonth
  `)
  console.log(`Encontrados ${rows.length} agregados para reconstruir`)

  // 3. Inserir novos registros em lotes
  let inserted = 0
  const now = new Date().toISOString()
  const BATCH = 50

  for (let i = 0; i < rows.length; i += BATCH) {
    const stmts = rows.slice(i, i + BATCH).map(r => ({
      sql: `INSERT INTO "ActualWeekly"
              (id, "clientId", year, month, "weekOfMonth",
               "totFaturado", "totProduct", icms, pis, cofins, ipi, "updatedAt")
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        createId(), String(r.clientId), Number(r.year), Number(r.month), Number(r.weekOfMonth),
        Number(r.totFaturado || 0), Number(r.totProduct || 0),
        Number(r.icms || 0), Number(r.pis || 0), Number(r.cofins || 0), Number(r.ipi || 0),
        now,
      ],
    }))
    await turso.batch(stmts)
    inserted += stmts.length
    process.stdout.write(`\r  Inserido: ${inserted}/${rows.length}`)
  }
  console.log('')

  // 4. Verificação: soma YTD SAÍDA após rebuild
  const { rows: check } = await turso.execute(`
    SELECT SUM(totFaturado) as soma, COUNT(*) as cnt
    FROM "ActualWeekly"
    WHERE year = 2026
  `)
  console.log(`\n✅ Rebuild concluído!`)
  console.log(`   ActualWeekly 2026: ${check[0].cnt} registros`)
  console.log(`   Soma YTD (apenas clientes linkados): R$ ${fmt(check[0].soma)}`)
  console.log(`\n   Referência financeiro: R$ 545.549.252,99`)

  process.exit(0)
}

main().catch(e => { console.error('\n❌ Erro:', e.message); process.exit(1) })
