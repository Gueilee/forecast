/**
 * Script de importação única do forecast.xlsx para o banco de dados.
 * Extrai 413 clientes e 12 meses de plano orçamentário da aba BASE.
 *
 * Execução: npx ts-node --esm scripts/import-excel.ts
 * ou:       npx tsx scripts/import-excel.ts
 */

import * as XLSX from 'xlsx'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

// Caminho do Excel (ajuste se necessário)
const EXCEL_PATH = path.resolve(
  'c:/SHP.old/OneDrive - Vendemmia/Documentos/02 - Gestão de Projetos/40 - Forecast/forecast.xlsx'
)

const YEAR = 2026

// Estrutura de cada bloco mensal na aba BASE
// Cada mês começa na coluna indicada abaixo (índice 0)
const MONTH_START_COLS: Record<number, number> = {
  1: 16,   // Janeiro  = coluna Q (índice 16)
  2: 28,   // Fevereiro
  3: 40,   // Março
  4: 52,   // Abril
  5: 64,   // Maio
  6: 76,   // Junho
  7: 88,   // Julho
  8: 100,  // Agosto
  9: 112,  // Setembro
  10: 124, // Outubro
  11: 136, // Novembro
  12: 148, // Dezembro
}

// Dentro de cada bloco mensal, offsets relativos ao mês:
const COL = {
  PLANO: 0,       // Coluna 0 do bloco = PLANO
  FC_MES: 1,      // FORECAST MÊS
  PEDIDO: 2,      // PEDIDO
  SEM_PEDIDO: 3,  // S/PEDIDO (RISCO/OPORT.)
  FATURADO: 4,    // FATURADO (realizado)
  DESVIO: 5,      // DESVIO PLANO
  A_FATURAR: 6,   // A FATURAR
  ULTIMA_SEM: 7,  // ÚLTIMA SEMANA
  MB_PLAN: 8,     // MB PLAN
  MB_FC: 9,       // MB FC
}

// Colunas dimensionais (índice 0 = coluna A)
const DIM = {
  NOME: 1,         // B - Nome completo
  REDUZIDO: 2,     // C - Nome reduzido
  GRAFICO: 3,      // D - Nome gráfico
  COMERCIAL: 4,    // E - Tipo comercial (BACKLOG, NOMINADOS, etc.)
  PL4_BU: 5,       // F - 4PL BU (1 BU, 2 BU, etc.)
  CONTA: 6,        // G - Account Manager
  CATEGORIA: 7,    // H - BU/Entidade (VCI, ARM-GRV, etc.)
  CAT_BKNV: 8,     // I - Categoria BK e NV
  ANALYTICS: 9,    // J - Analytics (SIM/NÃO)
  MODALIDADE: 10,  // K - Modalidade
  VOLUME: 11,      // L - Volume R$
  FATOR: 12,       // M - Fator Impostos
  MB_PCT: 13,      // N - % MB
}

function parseNumber(val: unknown): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') return val
  const s = String(val).replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parsePercent(val: unknown): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') {
    // If stored as decimal (e.g., 0.016 = 1.6%)
    return val < 1 && val > -1 ? val * 100 : val
  }
  const s = String(val).replace('%', '').replace(',', '.').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

async function main() {
  console.log('📂 Carregando arquivo Excel...')
  const workbook = XLSX.readFile(EXCEL_PATH, { cellNF: true, cellText: false })
  const sheet = workbook.Sheets['Base']

  if (!sheet) throw new Error('Aba "Base" não encontrada no Excel')

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })

  console.log(`📊 Total de linhas no sheet: ${rows.length}`)

  // Linha 4 = índice 4 (0-based) é a linha de cabeçalhos (linha 5 no Excel)
  // Dados começam na linha 5 (índice 5)

  const clients: {
    name: string
    nameReduced: string
    nameChart: string | null
    accountManager: string | null
    commercialType: string | null
    pl4Bu: string | null
    entity: string | null
    category: string | null
    categoryBkNv: string | null
    analytics: boolean
    modality: string | null
    volumeRef: number | null
    sortOrder: number
    budget: Record<number, {
      plan: number
      fcMonth: number | null
      orders: number | null
      withoutOrders: number | null
      mbPlanPct: number | null
      mbFcPct: number | null
    }>
  }[] = []

  for (let rowIdx = 5; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx] as unknown[]
    const name = String(row[DIM.NOME] ?? '').trim()
    const commercialType = String(row[DIM.COMERCIAL] ?? '').trim()

    // Skip empty rows and NÃO MEXER
    if (!name || commercialType === 'NÃO MEXER') continue

    const nameReduced = String(row[DIM.REDUZIDO] ?? name).trim()
    const nameChart = row[DIM.GRAFICO] ? String(row[DIM.GRAFICO]).trim() : null
    const accountManager = row[DIM.CONTA] ? String(row[DIM.CONTA]).trim() : null
    const pl4Bu = row[DIM.PL4_BU] ? String(row[DIM.PL4_BU]).trim() : null
    const entity = row[DIM.CATEGORIA] ? String(row[DIM.CATEGORIA]).trim() : null
    const category = row[DIM.CAT_BKNV] ? String(row[DIM.CAT_BKNV]).trim() : null
    const categoryBkNv = category
    const analyticsRaw = String(row[DIM.ANALYTICS] ?? '').trim().toUpperCase()
    const analytics = analyticsRaw === 'SIM' || analyticsRaw === 'S' || analyticsRaw === 'YES'
    const modality = row[DIM.MODALIDADE] ? String(row[DIM.MODALIDADE]).trim() : null

    const budget: Record<number, {
      plan: number
      fcMonth: number | null
      orders: number | null
      withoutOrders: number | null
      mbPlanPct: number | null
      mbFcPct: number | null
    }> = {}

    for (const [monthStr, startCol] of Object.entries(MONTH_START_COLS)) {
      const month = parseInt(monthStr)
      const plan = parseNumber(row[startCol + COL.PLANO]) ?? 0
      const fcMonth = parseNumber(row[startCol + COL.FC_MES])
      const orders = parseNumber(row[startCol + COL.PEDIDO])
      const withoutOrders = parseNumber(row[startCol + COL.SEM_PEDIDO])
      const mbPlanPct = parsePercent(row[startCol + COL.MB_PLAN])
      const mbFcPct = parsePercent(row[startCol + COL.MB_FC])

      budget[month] = { plan, fcMonth, orders, withoutOrders, mbPlanPct, mbFcPct }
    }

    const volumeRef = parseNumber(row[DIM.VOLUME])

    clients.push({
      name,
      nameReduced,
      nameChart,
      accountManager,
      commercialType,
      pl4Bu,
      entity,
      category,
      categoryBkNv,
      analytics,
      modality,
      volumeRef,
      sortOrder: rowIdx,
      budget,
    })
  }

  console.log(`✅ ${clients.length} clientes extraídos do Excel`)

  // Criar admin padrão se não existir
  console.log('\n👤 Criando usuário admin padrão...')
  const adminExists = await db.user.findUnique({ where: { email: 'admin@vendemmia.com.br' } })
  if (!adminExists) {
    await db.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@vendemmia.com.br',
        password: await bcrypt.hash('Vendemmia@2026', 10),
        role: 'ADMIN',
      },
    })
    console.log('  → admin@vendemmia.com.br criado (senha: Vendemmia@2026)')
  } else {
    console.log('  → Admin já existe, pulando')
  }

  // Importar clientes e orçamento
  console.log('\n📥 Importando clientes e plano orçamentário...')
  let created = 0
  let updated = 0
  let budgetEntries = 0

  for (const client of clients) {
    // Cada linha do Excel é uma entrada independente (cliente × modalidade × BU)
    // Identificação única: sortOrder (índice da linha no Excel)
    const upserted = await db.client.upsert({
      where: { sortOrder: client.sortOrder },
      create: {
        name: client.name,
        nameReduced: client.nameReduced,
        nameChart: client.nameChart,
        accountManager: client.accountManager,
        commercialType: client.commercialType,
        pl4Bu: client.pl4Bu,
        entity: client.entity,
        category: client.category,
        categoryBkNv: client.categoryBkNv,
        analytics: client.analytics,
        modality: client.modality,
        volumeRef: client.volumeRef,
        sortOrder: client.sortOrder,
      },
      update: {
        name: client.name,
        nameReduced: client.nameReduced,
        nameChart: client.nameChart,
        accountManager: client.accountManager,
        commercialType: client.commercialType,
        pl4Bu: client.pl4Bu,
        entity: client.entity,
        category: client.category,
        categoryBkNv: client.categoryBkNv,
        analytics: client.analytics,
        modality: client.modality,
        volumeRef: client.volumeRef,
      },
    })
    const clientId = upserted.id
    created++

    // Upsert budget entries for all 12 months
    for (const [monthStr, entry] of Object.entries(client.budget)) {
      const month = parseInt(monthStr)
      await db.budgetEntry.upsert({
        where: { clientId_year_month: { clientId, year: YEAR, month } },
        create: {
          clientId,
          year: YEAR,
          month,
          plan: entry.plan,
          fcMonth: entry.fcMonth,
          orders: entry.orders,
          withoutOrders: entry.withoutOrders,
          mbPlanPct: entry.mbPlanPct,
          mbFcPct: entry.mbFcPct,
        },
        update: {
          plan: entry.plan,
          fcMonth: entry.fcMonth,
          orders: entry.orders,
          withoutOrders: entry.withoutOrders,
          mbPlanPct: entry.mbPlanPct,
          mbFcPct: entry.mbFcPct,
        },
      })
      budgetEntries++
    }
  }

  console.log(`  → ${created} linhas importadas (clientes × modalidade)`)
  console.log(`  → ${budgetEntries} entradas de orçamento importadas`)

  // Validation totals
  const totPlan = await db.budgetEntry.aggregate({
    where: { year: YEAR },
    _sum: { plan: true },
  })
  console.log(`\n📊 VALIDAÇÃO`)
  console.log(`  Plano Total 2026 no banco: R$ ${(totPlan._sum.plan ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Esperado (Excel): R$ 447.823.285,91`)

  const totalClients = await db.client.count({ where: { isActive: true } })
  console.log(`  Total linhas ativas no banco: ${totalClients}`)
  console.log(`  Esperado (Excel): 413`)
  console.log(`  Obs: 413 linhas = 218 empresas únicas × múltiplas modalidades/BUs`)

  console.log('\n✅ Importação concluída!')
  await db.$disconnect()
}

main().catch((e) => {
  console.error('❌ Erro na importação:', e)
  db.$disconnect()
  process.exit(1)
})
