/**
 * Comparativo completo: Excel vs Turso
 * Mostra totais por mês + divergências por cliente
 */
'use strict'

const ExcelJS = require('exceljs')
const { createClient } = require('@libsql/client')

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
const FILE = 'C:\\SHP.old\\OneDrive - Vendemmia\\Documentos\\02 - Gestão de Projetos\\40 - Forecast\\nova_base.xlsx'
const YEAR = 2026
const MONTH_BASE = Array.from({ length: 12 }, (_, i) => 8 + i * 11)
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const OFF = { PLANO:0, FC:1, PEDIDO:2, SPEDIDO:3, FATURADO:4, LASTWEEK:7 }

const num = v => (v == null || v === '' || Number.isNaN(Number(v))) ? 0 : Number(v)
const M   = (v, d=2) => { const n = Number(v??0); return (n/1_000_000).toFixed(d)+'M' }
const OK  = '✅'
const ERR = '❌'
const CHK = (diff) => Math.abs(diff) < 10 ? OK : ERR  // tolerância de R$10 para arredondamento

async function main() {
  // ── Ler Excel ─────────────────────────────────────────────────────────────
  const xlClients = new Map()  // key → { name, months:{m:{plan,fc,ped,fat,...}} }

  const stream = new ExcelJS.stream.xlsx.WorkbookReader(FILE, {
    worksheets:'emit', sharedStrings:'cache',
    hyperlinks:'ignore', styles:'ignore', drawings:'ignore',
  })
  await new Promise((res, rej) => {
    stream.on('worksheet', ws => {
      let idx = 0
      ws.on('row', row => {
        idx++
        if (idx <= 2) return
        const cells = {}
        row.eachCell({ includeEmpty: true }, (c, col) => { cells[col] = c.value })
        const name = String(cells[2] ?? '').trim()
        if (!name) return
        const key = name.toUpperCase()
        if (!xlClients.has(key)) xlClients.set(key, { name, months: {} })
        const entry = xlClients.get(key)
        for (let m = 1; m <= 12; m++) {
          const base = MONTH_BASE[m-1]
          if (!entry.months[m]) entry.months[m] = { plan:0, fc:0, ped:0, spd:0, fat:0, lw:0 }
          const em = entry.months[m]
          em.plan += num(cells[base + OFF.PLANO])
          em.fc   += num(cells[base + OFF.FC])
          em.ped  += num(cells[base + OFF.PEDIDO])
          em.spd  += num(cells[base + OFF.SPEDIDO])
          em.fat  += num(cells[base + OFF.FATURADO])
          em.lw   += num(cells[base + OFF.LASTWEEK])
        }
      })
    })
    stream.on('end', res); stream.on('error', rej); stream.read()
  })

  // ── Ler banco (apenas clientes ativos) ────────────────────────────────────
  const dbClients = await db.execute(`
    SELECT c.id, c.nameReduced,
           b.month, b.plan, b.fcMonth as fc, b.orders as ped,
           b.withoutOrders as spd, b.faturado as fat, b.lastWeek as lw
    FROM Client c
    JOIN BudgetEntry b ON b.clientId = c.id AND b.year = ${YEAR}
    WHERE c.isActive = 1
    ORDER BY c.nameReduced, b.month
  `)

  // Agrupa DB por cliente → mes
  const dbMap = new Map()
  for (const r of dbClients.rows) {
    const key = String(r.nameReduced ?? '').trim().toUpperCase()
    if (!dbMap.has(key)) dbMap.set(key, { name: String(r.nameReduced), months: {} })
    dbMap.get(key).months[Number(r.month)] = {
      plan: num(r.plan), fc: num(r.fc), ped: num(r.ped),
      spd: num(r.spd), fat: num(r.fat), lw: num(r.lw),
    }
  }

  // ── SEÇÃO 1: Totais anuais por campo ─────────────────────────────────────
  console.log('\n' + '═'.repeat(90))
  console.log('  COMPARATIVO TOTAL ANUAL (todos os meses somados)')
  console.log('═'.repeat(90))

  const fields = ['plan','fc','ped','spd','fat','lw']
  const labels = { plan:'PLANO', fc:'FC MÊS', ped:'PEDIDO', spd:'S/PEDIDO', fat:'FATURADO', lw:'ÚLT.SEM' }

  let xlTotal = {}, dbTotal = {}
  for (const f of fields) { xlTotal[f]=0; dbTotal[f]=0 }
  for (const [key, data] of xlClients) {
    for (let m=1; m<=12; m++) {
      const em = data.months[m] ?? {}
      for (const f of fields) xlTotal[f] += em[f] ?? 0
    }
  }
  for (const [key, data] of dbMap) {
    for (let m=1; m<=12; m++) {
      const em = data.months[m] ?? {}
      for (const f of fields) dbTotal[f] += em[f] ?? 0
    }
  }

  console.log(`\n  Campo      | Excel        | Banco        | Diferença    | Status`)
  console.log(`  -----------+--------------+--------------+--------------+-------`)
  for (const f of fields) {
    const diff = xlTotal[f] - dbTotal[f]
    console.log(`  ${labels[f].padEnd(10)} | ${M(xlTotal[f]).padStart(12)} | ${M(dbTotal[f]).padStart(12)} | ${M(diff).padStart(12)} | ${CHK(diff)}`)
  }

  // ── SEÇÃO 2: Totais por mês (PLANO e FATURADO) ───────────────────────────
  console.log('\n' + '═'.repeat(90))
  console.log('  TOTAIS POR MÊS — PLANO e FATURADO')
  console.log('═'.repeat(90))
  console.log(`\n  Mês  | PLANO Excel  | PLANO DB     | OK? | FAT Excel    | FAT DB       | OK?`)
  console.log(`  -----+--------------+--------------+-----+--------------+--------------+----`)

  for (let m=1; m<=12; m++) {
    let xlPlan=0, dbPlan=0, xlFat=0, dbFat=0
    for (const [, data] of xlClients) { const em=data.months[m]??{}; xlPlan+=em.plan??0; xlFat+=em.fat??0 }
    for (const [, data] of dbMap)    { const em=data.months[m]??{}; dbPlan+=em.plan??0; dbFat+=em.fat??0 }
    const dp=xlPlan-dbPlan, df=xlFat-dbFat
    console.log(`  ${MONTH_NAMES[m-1].padEnd(4)} | ${M(xlPlan).padStart(12)} | ${M(dbPlan).padStart(12)} | ${CHK(dp)}  | ${M(xlFat).padStart(12)} | ${M(dbFat).padStart(12)} | ${CHK(df)}`)
  }

  // ── SEÇÃO 3: Divergências por cliente ────────────────────────────────────
  console.log('\n' + '═'.repeat(90))
  console.log('  DIVERGÊNCIAS POR CLIENTE (diferença > R$1.000 no plano anual ou faturado)')
  console.log('═'.repeat(90))

  let divergencias = 0
  const clientKeys = new Set([...xlClients.keys(), ...dbMap.keys()])

  const diffs = []
  for (const key of clientKeys) {
    const xl = xlClients.get(key)
    const db = dbMap.get(key)
    const name = xl?.name ?? db?.name ?? key

    let xlPlanAnual=0, dbPlanAnual=0, xlFatAnual=0, dbFatAnual=0
    for (let m=1; m<=12; m++) {
      xlPlanAnual += xl?.months[m]?.plan ?? 0
      dbPlanAnual += db?.months[m]?.plan ?? 0
      xlFatAnual  += xl?.months[m]?.fat  ?? 0
      dbFatAnual  += db?.months[m]?.fat  ?? 0
    }
    const dPlan = Math.abs(xlPlanAnual - dbPlanAnual)
    const dFat  = Math.abs(xlFatAnual  - dbFatAnual)

    if (dPlan > 1000 || dFat > 1000) {
      diffs.push({ name, xlPlanAnual, dbPlanAnual, xlFatAnual, dbFatAnual, dPlan, dFat })
      divergencias++
    }
  }

  if (divergencias === 0) {
    console.log('\n  ✅  Nenhuma divergência encontrada! Todos os clientes estão idênticos.')
  } else {
    console.log(`\n  ${divergencias} cliente(s) com divergência:\n`)
    console.log(`  Cliente                    | PLANO XL     | PLANO DB     | FAT XL       | FAT DB`)
    console.log(`  ---------------------------+--------------+--------------+--------------+----------`)
    for (const d of diffs.sort((a,b) => b.dPlan - a.dPlan)) {
      console.log(
        `  ${d.name.substring(0,26).padEnd(26)} | ${M(d.xlPlanAnual).padStart(12)} | ${M(d.dbPlanAnual).padStart(12)} | ${M(d.xlFatAnual).padStart(12)} | ${M(d.dbFatAnual)}`
      )
    }
  }

  // ── SEÇÃO 4: Clientes no Excel mas não no banco (e vice-versa) ───────────
  console.log('\n' + '═'.repeat(90))
  console.log('  CLIENTES — PRESENÇA')
  console.log('═'.repeat(90))

  const onlyInXl = [...xlClients.keys()].filter(k => !dbMap.has(k))
  const onlyInDb = [...dbMap.keys()].filter(k => !xlClients.has(k))

  if (onlyInXl.length === 0) {
    console.log(`\n  ✅  Todos os ${xlClients.size} clientes do Excel estão no banco.`)
  } else {
    console.log(`\n  ❌  ${onlyInXl.length} clientes no Excel mas NÃO no banco:`)
    for (const k of onlyInXl) console.log(`      - ${xlClients.get(k)?.name}`)
  }

  if (onlyInDb.length === 0) {
    console.log(`  ✅  Nenhum cliente extra no banco que não esteja no Excel.`)
  } else {
    console.log(`\n  ⚠️   ${onlyInDb.length} clientes ativos no banco mas NÃO no Excel:`)
    for (const k of onlyInDb) console.log(`      - ${dbMap.get(k)?.name}`)
  }

  // ── RESUMO FINAL ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(90))
  const tudo_ok = divergencias === 0 && onlyInXl.length === 0 && onlyInDb.length === 0
  if (tudo_ok) {
    console.log('  ✅  RESULTADO: BANCO IDÊNTICO AO EXCEL — todos os dados conferem.')
  } else {
    console.log(`  ⚠️   RESULTADO: HÁ DIVERGÊNCIAS — ${divergencias} cliente(s), ${onlyInXl.length} faltando no banco, ${onlyInDb.length} extras.`)
  }
  console.log('═'.repeat(90) + '\n')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
