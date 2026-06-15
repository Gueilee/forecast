/**
 * Utilitários de janela de lançamento de Forecast
 *
 * Regra de negócio:
 *   - Janela ABRE: segunda-feira 08:00 (horário de Brasília)
 *   - Janela FECHA: quinta-feira 22:00 (horário de Brasília)
 *   - Bloqueado: qui ≥ 22h, sex, sáb, dom, seg < 08h
 */

/** Retorna a data/hora atual convertida para horário de Brasília (UTC-3). */
export function toBrasilia(utcDate = new Date()): Date {
  return new Date(utcDate.getTime() - 3 * 60 * 60 * 1000)
}

/** Retorna o número de semana ISO e o ano ISO de uma data. */
export function getIsoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { week, year: d.getUTCFullYear() }
}

/** Verifica se o FC está bloqueado dado um Date já convertido para Brasília. */
export function isFcLockedAt(brt: Date): boolean {
  const day  = brt.getUTCDay()   // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  const hour = brt.getUTCHours()
  if (day === 1 && hour < 8)  return true  // Segunda antes das 08h
  if (day === 4 && hour >= 22) return true // Quinta-feira a partir das 22h
  if (day === 5 || day === 6 || day === 0) return true // Sexta, Sábado, Domingo
  return false
}

/** Verifica se o FC está bloqueado agora (converte UTC → BRT automaticamente). */
export function isFcLocked(): boolean {
  return isFcLockedAt(toBrasilia())
}

export interface FcWindowInfo {
  isOpen:  boolean
  isoWeek: number
  isoYear: number
}

export function getFcWindowInfo(): FcWindowInfo {
  const brt    = toBrasilia()
  const isOpen = !isFcLockedAt(brt)
  const { week, year } = getIsoWeek(brt)
  return { isOpen, isoWeek: week, isoYear: year }
}

/**
 * Retorna a semana ISO da janela mais recentemente fechada.
 * Usado para criação lazy do snapshot ao abrir a página.
 */
export function getLastClosedWindow(): { isoWeek: number; isoYear: number } {
  const brt  = toBrasilia()
  const day  = brt.getUTCDay()
  const hour = brt.getUTCHours()

  // Quantos dias voltar até a quinta-feira mais recente que fechou:
  let daysBack: number
  if      (day === 4 && hour >= 22) daysBack = 0  // Esta quinta já fechou
  else if (day === 5)               daysBack = 1  // Sexta: quinta ontem
  else if (day === 6)               daysBack = 2  // Sábado: quinta anteontem
  else if (day === 0)               daysBack = 3  // Domingo: quinta há 3 dias
  else if (day === 1)               daysBack = 4  // Segunda: quinta há 4 dias
  else if (day === 2)               daysBack = 5  // Terça: quinta há 5 dias
  else if (day === 3)               daysBack = 6  // Quarta: quinta há 6 dias
  else                              daysBack = 7  // Quinta antes das 22h: semana passada

  const lastThursday = new Date(brt)
  lastThursday.setUTCDate(lastThursday.getUTCDate() - daysBack)
  const { week: isoWeek, year: isoYear } = getIsoWeek(lastThursday)
  return { isoWeek, isoYear }
}
