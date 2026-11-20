import type { Entry } from '../types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatBRL = (value: number) => brl.format(value)

export function signedAmount(e: Pick<Entry, 'type' | 'amount'>) {
  return e.type === 'retirada' ? -Number(e.amount) : Number(e.amount)
}

export function sumEntries(entries: Pick<Entry, 'type' | 'amount'>[]) {
  return entries.reduce((acc, e) => acc + signedAmount(e), 0)
}

export function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso: string) {
  const date = parseISODate(iso)
  const today = parseISODate(todayISO())
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatMonth(iso: string) {
  const s = parseISODate(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
