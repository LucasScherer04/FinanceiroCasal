export type EntryType = 'deposito' | 'rendimento' | 'retirada'
export type DestinationKind = 'caixinha' | 'investimento'

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
