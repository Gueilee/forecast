import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${value.toFixed(decimals)}%`
}

export function formatMillions(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`
  }
  return formatCurrency(value)
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export function weekOfMonth(date: Date): number {
  const day = date.getDate()
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  if (day <= 28) return 4
  return 5
}

export function desvioColor(desvio: number, plan: number): string {
  if (plan === 0) return 'text-gray-400'
  const pct = plan > 0 ? desvio / plan : 0
  if (pct >= 0) return 'text-emerald-600'
  if (pct >= -0.2) return 'text-amber-600'
  return 'text-red-600'
}

export function desvioBackground(desvio: number, plan: number): string {
  if (plan === 0) return ''
  const pct = plan > 0 ? desvio / plan : 0
  if (pct >= 0) return 'bg-emerald-50'
  if (pct >= -0.2) return 'bg-amber-50'
  return 'bg-red-50'
}
