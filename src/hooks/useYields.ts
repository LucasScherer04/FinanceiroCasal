import { useEffect, useMemo, useState } from 'react'
import { annualFromDaily, getCdiRates, type CdiRate } from '../lib/cdi'
import { computeYields, hasAutoYield } from '../lib/yield'
import { useData } from './useData'

export type CdiStatus = 'idle' | 'loading' | 'ok' | 'error'

/** Rendimento automático pelo CDI, por pessoa, por caixinha e total. */
export function useYields() {
  const { entries, destinations } = useData()
  const [rates, setRates] = useState<CdiRate[]>([])
  const [status, setStatus] = useState<CdiStatus>('idle')

  // data do lançamento mais antigo em caixinha que rende pelo CDI
  const from = useMemo(() => {
    // o calendário de dias úteis vem da série do CDI, então serve também para taxa fixa (FGTS)
    const cdiDest = new Set(destinations.filter(hasAutoYield).map((d) => d.id))
    let min: string | null = null
    for (const e of entries) {
      if (e.destination_id && cdiDest.has(e.destination_id) && (!min || e.date < min)) min = e.date
    }
    return min
  }, [entries, destinations])

  useEffect(() => {
    if (!from) return
    let alive = true
    setStatus('loading')
    getCdiRates(from)
      .then((r) => {
        if (!alive) return
        setRates(r)
        setStatus('ok')
      })
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [from])

  return useMemo(() => {
    const buckets = computeYields(entries, destinations, rates)
    let total = 0
    const byUser = new Map<string, number>()
    const byDest = new Map<string, number>()
    for (const [key, value] of buckets) {
      const [userId, destId] = key.split('|')
      total += value
      byUser.set(userId, (byUser.get(userId) ?? 0) + value)
      byDest.set(destId, (byDest.get(destId) ?? 0) + value)
    }
    const last = rates.at(-1)
    return {
      status: from ? status : ('idle' as CdiStatus),
      total,
      byUser: (id: string) => byUser.get(id) ?? 0,
      byDest: (id: string) => byDest.get(id) ?? 0,
      lastRateDate: last?.[0] ?? null,
      cdiAnnual: last ? annualFromDaily(last[1]) : null,
    }
  }, [entries, destinations, rates, status, from])
}
