export type EntryType = 'deposito' | 'rendimento' | 'retirada'
export type DestinationKind = 'caixinha' | 'investimento' | 'fgts'

export interface Profile {
  id: string
  name: string
  color: string
}

export interface Goal {
  id: string
  title: string
  target_amount: number
}

export interface Destination {
  id: string
  name: string
  kind: DestinationKind
  /** % do CDI (100 = 100% do CDI). null = não rende pelo CDI */
  cdi_percent: number | null
  /** taxa fixa em % ao ano (ex.: 3 = FGTS). Usada quando não há % do CDI */
  annual_rate: number | null
}

export const DESTINATION_ICON: Record<DestinationKind, string> = {
  caixinha: '🐷',
  investimento: '📈',
  fgts: '🏦',
}

export const DESTINATION_LABEL: Record<DestinationKind, string> = {
  caixinha: 'Caixinha',
  investimento: 'Investimento',
  fgts: 'FGTS',
}

const pct = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

/** Texto curto de como o destino rende, ou null se não rende sozinho. */
export function rateLabel(d: Pick<Destination, 'cdi_percent' | 'annual_rate'>): string | null {
  if (d.cdi_percent && d.cdi_percent > 0) return `${pct(d.cdi_percent)}% do CDI`
  if (d.annual_rate && d.annual_rate > 0) return `${pct(d.annual_rate)}% a.a.`
  return null
}

export interface Entry {
  id: string
  user_id: string
  goal_id: string
  destination_id: string | null
  type: EntryType
  amount: number
  date: string // yyyy-mm-dd
  note: string | null
  created_at: string
}

export const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  deposito: 'Depósito',
  rendimento: 'Rendimento',
  retirada: 'Retirada',
}
