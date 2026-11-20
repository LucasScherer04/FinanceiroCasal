import { useEffect, useState, type FormEvent } from 'react'
import { useData } from '../hooks/useData'
import { formatBRL } from '../lib/format'
import { supabase } from '../lib/supabase'
import { DESTINATION_ICON, DESTINATION_LABEL, rateLabel, type Destination, type DestinationKind } from '../types'

const COLORS = ['#059669', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308']

const card = 'mb-4 rounded-2xl bg-white p-4 shadow-sm'
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
const btn = 'rounded-lg bg-brand px-4 py-2 font-medium text-white active:bg-brand-dark disabled:opacity-60'

type RateMode = 'cdi' | 'fixa' | 'nenhum'
interface Rate {
  mode: RateMode
  value: string
}

const DEFAULT_RATE: Record<DestinationKind, Rate> = {
  caixinha: { mode: 'cdi', value: '100' },
  investimento: { mode: 'cdi', value: '100' },
  fgts: { mode: 'fixa', value: '3' },
}

const fmtNum = (v: number) => String(v).replace('.', ',')

function rateOf(d: Destination): Rate {
  if (d.cdi_percent && d.cdi_percent > 0) return { mode: 'cdi', value: fmtNum(d.cdi_percent) }
  if (d.annual_rate && d.annual_rate > 0) return { mode: 'fixa', value: fmtNum(d.annual_rate) }
  return { mode: 'nenhum', value: '' }
}

/** Converte o formulário nas colunas do banco; null = valor inválido. */
function rateToColumns(r: Rate): { cdi_percent: number | null; annual_rate: number | null } | null {
  if (r.mode === 'nenhum') return { cdi_percent: null, annual_rate: null }
  const n = Number(r.value.trim().replace('%', '').replace(',', '.'))
  const max = r.mode === 'cdi' ? 1000 : 100
  if (!r.value.trim() || !Number.isFinite(n) || n <= 0 || n > max) return null
  return r.mode === 'cdi' ? { cdi_percent: n, annual_rate: null } : { cdi_percent: null, annual_rate: n }
}

const RATE_MODES: [RateMode, string][] = [
  ['cdi', '% do CDI'],
  ['fixa', 'Taxa fixa a.a.'],
  ['nenhum', 'Manual'],
]

function RateInput({ rate, onChange }: { rate: Rate; onChange: (r: Rate) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200 p-1 text-xs">
        {RATE_MODES.map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() =>
              onChange({ mode: m, value: m === rate.mode ? rate.value : m === 'cdi' ? '100' : m === 'fixa' ? '3' : '' })
            }
            className={`rounded-md py-1.5 font-medium ${rate.mode === m ? 'bg-white shadow-sm' : 'text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {rate.mode !== 'nenhum' && (
        <div className="flex items-center rounded-lg border border-slate-300 bg-white pr-3">
          <input
            value={rate.value}
            onChange={(e) => onChange({ ...rate, value: e.target.value })}
            inputMode="decimal"
            className="w-full rounded-lg bg-transparent px-3 py-2 outline-none"
          />
          <span className="shrink-0 text-sm text-slate-500">{rate.mode === 'cdi' ? '% do CDI' : '% ao ano'}</span>
        </div>
      )}
    </div>
  )
}

export function Settings() {
  const { me, goal, destinations, entries, reload } = useData()
  const [msg, setMsg] = useState<string | null>(null)

  // perfil
  const [name, setName] = useState(me?.name ?? '')
  const [color, setColor] = useState(me?.color ?? COLORS[0])
  useEffect(() => {
    if (me) {
      setName(me.name)
      setColor(me.color)
    }
  }, [me])

  // meta
  const [title, setTitle] = useState(goal?.title ?? '')
  const [target, setTarget] = useState(String(goal?.target_amount ?? 100000))
  useEffect(() => {
    if (goal) {
      setTitle(goal.title)
      setTarget(String(goal.target_amount))
    }
  }, [goal])

  // destinos
  const [destName, setDestName] = useState('')
  const [destKind, setDestKind] = useState<DestinationKind>('caixinha')
  const [destRate, setDestRate] = useState<Rate>(DEFAULT_RATE.caixinha)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRate, setEditRate] = useState<Rate>(DEFAULT_RATE.caixinha)

  function changeKind(kind: DestinationKind) {
    setDestKind(kind)
    setDestRate(DEFAULT_RATE[kind])
    if (kind === 'fgts' && !destName.trim()) setDestName('FGTS')
  }

  async function run(promise: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await promise
    setMsg(error ? `Erro: ${error.message}` : ok)
    if (!error) await reload()
  }

  function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!me) return
    run(supabase.from('profiles').update({ name: name.trim(), color }).eq('id', me.id), 'Perfil salvo!')
  }

  function saveGoal(e: FormEvent) {
    e.preventDefault()
    const value = Number(target.replace(/\./g, '').replace(',', '.'))
    if (!goal || !(value > 0)) return setMsg('Valor da meta inválido.')
    run(supabase.from('goals').update({ title: title.trim(), target_amount: value }).eq('id', goal.id), 'Meta salva!')
  }

  function addDestination(e: FormEvent) {
    e.preventDefault()
    if (!destName.trim()) return
    const cols = rateToColumns(destRate)
    if (!cols) return setMsg('Rendimento inválido. Use um número, ex.: 100 ou 110,5.')
    run(supabase.from('destinations').insert({ name: destName.trim(), kind: destKind, ...cols }), 'Destino adicionado!')
    setDestName('')
    setDestKind('caixinha')
    setDestRate(DEFAULT_RATE.caixinha)
  }

  function saveRate(id: string) {
    const cols = rateToColumns(editRate)
    if (!cols) return setMsg('Rendimento inválido.')
    run(supabase.from('destinations').update(cols).eq('id', id), 'Rendimento atualizado!')
    setEditingId(null)
  }

  function removeDestination(id: string, label: string) {
    const used = entries.some((e) => e.destination_id === id)
    const warn = used ? '\n\nOs lançamentos dele continuam, mas ficam sem destino.' : ''
    if (!confirm(`Remover "${label}"?${warn}`)) return
    run(supabase.from('destinations').delete().eq('id', id), 'Destino removido.')
  }

  return (
    <div className="pt-safe px-4">
      <h1 className="py-4 text-xl font-bold">Ajustes</h1>
      {msg && (
        <p className="mb-3 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white" onClick={() => setMsg(null)}>
          {msg}
        </p>
      )}

      <form onSubmit={saveProfile} className={card}>
        <h2 className="mb-3 font-semibold">Meu perfil</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={30} className={input} placeholder="Seu nome" />
        <div className="my-3 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full ${color === c ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <button className={btn}>Salvar perfil</button>
      </form>

      <form onSubmit={saveGoal} className={card}>
        <h2 className="mb-3 font-semibold">Meta</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={`${input} mb-2`} placeholder="Nome da meta" />
        <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" required className={`${input} mb-1`} />
        <p className="mb-3 text-xs text-slate-500">Atual: {formatBRL(goal?.target_amount ?? 0)}</p>
        <button className={btn}>Salvar meta</button>
      </form>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Caixinhas, investimentos e FGTS</h2>
        {destinations.length === 0 && <p className="mb-2 text-sm text-slate-500">Nenhum cadastrado.</p>}
        <ul className="mb-4 divide-y divide-slate-100">
          {destinations.map((d) => {
            const label = rateLabel(d)
            return (
              <li key={d.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate">{DESTINATION_ICON[d.kind]} {d.name}</p>
                    <p className="text-xs text-slate-500">
                      {label ? `${label} · rendimento automático` : 'Rendimento manual'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(editingId === d.id ? null : d.id)
                        setEditRate(rateOf(d))
                      }}
                      className="text-brand"
                    >
                      Rendimento
                    </button>
                    <button type="button" onClick={() => removeDestination(d.id, d.name)} className="text-rose-600">
                      Remover
                    </button>
                  </div>
                </div>
                {editingId === d.id && (
                  <div className="mt-2 space-y-2">
                    <RateInput rate={editRate} onChange={setEditRate} />
                    <button type="button" onClick={() => saveRate(d.id)} className={`${btn} w-full`}>Salvar</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <form onSubmit={addDestination} className="space-y-2 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-medium">Adicionar</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200 p-1 text-sm">
            {(Object.keys(DESTINATION_LABEL) as DestinationKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => changeKind(k)}
                className={`rounded-md py-1.5 font-medium ${destKind === k ? 'bg-white shadow-sm' : 'text-slate-600'}`}
              >
                {DESTINATION_ICON[k]} {DESTINATION_LABEL[k]}
              </button>
            ))}
          </div>
          <input
            value={destName}
            onChange={(e) => setDestName(e.target.value)}
            className={input}
            placeholder={destKind === 'fgts' ? 'Ex.: FGTS Lucas' : destKind === 'caixinha' ? 'Ex.: Caixinha Nubank' : 'Ex.: CDB Inter'}
          />
          <p className="pt-1 text-xs font-medium text-slate-600">Como rende</p>
          <RateInput rate={destRate} onChange={setDestRate} />
          <p className="text-xs text-slate-500">
            {destKind === 'fgts'
              ? 'O FGTS rende 3% ao ano + TR. Deixamos 3% a.a.; para incluir a TR, aumente a taxa (ex.: 4,5). Lance como depósito o saldo atual do extrato do FGTS e, depois, os depósitos mensais. A distribuição de lucros anual pode ser lançada como "Rendimento".'
              : 'Ex.: Caixinha Nubank = 100% do CDI, CDB 110% = 110. "Manual" para o que não rende sozinho (ex.: ações).'}
          </p>
          <button className={`${btn} w-full`}>Adicionar</button>
        </form>
      </section>

      <button
        onClick={() => supabase.auth.signOut()}
        className="mb-6 w-full rounded-xl border border-slate-300 bg-white py-3 font-medium text-slate-700"
      >
        Sair
      </button>
    </div>
  )
}
