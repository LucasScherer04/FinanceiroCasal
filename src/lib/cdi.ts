import { todayISO } from './format'

/**
 * Taxa DI diária (CDI) do Banco Central, série SGS 12.
 * Cada valor é a taxa em % ao dia útil (ex.: 0.050788 = 0,050788% no dia).
 * Taxas passadas nunca mudam, então ficam em cache no aparelho (localStorage)
 * e só os dias novos são buscados.
 */
export type CdiRate = [date: string, ratePct: number] // ['2026-11-19', 0.050788]

interface Cache {
  from: string // primeira data coberta pelo cache
  checkedOn: string // dia em que buscamos pela última vez
  rates: CdiRate[] // ordenado por data
}

const KEY = 'financeiro-cdi-v1'
const SGS = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados'

const toBR = (iso: string) => iso.split('-').reverse().join('/')
const fromBR = (br: string) => br.split('/').reverse().join('-')

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Cache) : null
  } catch {
    return null
  }
}

function writeCache(c: Cache) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    /* sem storage: só não guarda o cache */
  }
}

async function fetchRange(from: string, to: string): Promise<CdiRate[]> {
  const url = `${SGS}?formato=json&dataInicial=${toBR(from)}&dataFinal=${toBR(to)}`
  const res = await fetch(url)
  // o BCB responde 404 quando não há nenhum dia útil no intervalo
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Banco Central respondeu ${res.status}`)
  const data = (await res.json()) as { data: string; valor: string }[]
  return data.map((x) => [fromBR(x.data), Number(x.valor)] as CdiRate).filter(([, r]) => Number.isFinite(r))
}

let inflight: Promise<CdiRate[]> | null = null

/** Taxas diárias do CDI de `from` até hoje. */
export function getCdiRates(from: string): Promise<CdiRate[]> {
  if (inflight) return inflight
  inflight = load(from).finally(() => {
    inflight = null
  })
  return inflight
}

async function load(from: string): Promise<CdiRate[]> {
  const today = todayISO()
  const cache = readCache()

  if (cache && cache.from <= from) {
    if (cache.checkedOn === today) return cache.rates
    const last = cache.rates.at(-1)?.[0] ?? cache.from
    try {
      const fresh = await fetchRange(last, today)
      const rates = [...cache.rates.filter(([d]) => d < last), ...fresh]
      writeCache({ from: cache.from, checkedOn: today, rates })
      return rates
    } catch {
      return cache.rates // sem internet / BCB fora: usa o que já tem
    }
  }

  const rates = await fetchRange(from, today)
  writeCache({ from, checkedOn: today, rates })
  return rates
}

/** Converte a taxa diária em taxa anual (252 dias úteis). */
export const annualFromDaily = (dailyPct: number) => (Math.pow(1 + dailyPct / 100, 252) - 1) * 100
