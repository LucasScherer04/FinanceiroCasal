import type { CdiRate } from './cdi'
import { signedAmount } from './format'
import type { Destination, Entry } from '../types'

/** O destino rende sozinho (CDI ou taxa fixa)? */
export const hasAutoYield = (d: Pick<Destination, 'cdi_percent' | 'annual_rate'>) =>
  Boolean((d.cdi_percent && d.cdi_percent > 0) || (d.annual_rate && d.annual_rate > 0))

/**
 * Rendimento de um dia útil, dado o CDI do dia (em %).
 * - % do CDI: CDI do dia × percentual (ex.: 110% do CDI)
 * - taxa fixa ao ano (ex.: FGTS 3% a.a.): (1 + taxa)^(1/252) − 1, todo dia útil
 */
function dailyGrowth(d: Destination): ((cdiDayPct: number) => number) | null {
  if (d.cdi_percent && d.cdi_percent > 0) {
    const p = d.cdi_percent / 100
    return (cdi) => (cdi / 100) * p
  }
  if (d.annual_rate && d.annual_rate > 0) {
    const daily = Math.pow(1 + d.annual_rate / 100, 1 / 252) - 1
    return () => daily
  }
  return null
}

export const bucketKey =(userId: string, destinationId: string) => `${userId}|${destinationId}`

/**
 * Rendimento estimado (bruto, antes de IR) de cada "pote" pessoa × caixinha.
 *
 * Simula o saldo dia útil a dia útil: em cada dia, entram os depósitos/retiradas
 * até aquela data e o saldo é corrigido por (1 + CDI do dia × %CDI da caixinha).
 * Assim retiradas e depósitos em datas diferentes são tratados corretamente.
 */
export function computeYields(entries: Entry[], destinations: Destination[], rates: CdiRate[]) {
  const result = new Map<string, number>()
  if (rates.length === 0) return result

  for (const dest of destinations) {
    const growth = dailyGrowth(dest)
    if (!growth) continue

    const byUser = new Map<string, Entry[]>()
    for (const e of entries) {
      if (e.destination_id !== dest.id) continue
      byUser.set(e.user_id, [...(byUser.get(e.user_id) ?? []), e])
    }

    for (const [userId, list] of byUser) {
      const events = [...list].sort((a, b) => a.date.localeCompare(b.date))
      let balance = 0
      let principal = 0
      let i = 0
      for (const [day, ratePct] of rates) {
        while (i < events.length && events[i].date <= day) {
          const v = signedAmount(events[i])
          balance += v
          principal += v
          i++
        }
        if (i === 0) continue // ainda não tinha dinheiro nesse dia
        balance *= 1 + growth(ratePct)
      }
      result.set(bucketKey(userId, dest.id), balance - principal)
    }
  }
  return result
}
