import { useEffect, useState, type FormEvent } from 'react'
import { useData } from '../hooks/useData'
import { formatBRL } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { DestinationKind } from '../types'

const COLORS = ['#059669', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308']

const card = 'mb-4 rounded-2xl bg-white p-4 shadow-sm'
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
const btn = 'rounded-lg bg-brand px-4 py-2 font-medium text-white active:bg-brand-dark disabled:opacity-60'

/** '' -> null (sem CDI); número válido -> número; inválido -> undefined */
function parseCdi(raw: string): number | null | undefined {
  const s = raw.trim().replace('%', '').replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : undefined
}

function CdiInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-1 items-center rounded-lg border border-slate-300 bg-white pr-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        placeholder="% do CDI"
        className="w-full rounded-lg bg-transparent px-3 py-2 outline-none"
      />
      <span className="shrink-0 text-sm text-slate-500">% do CDI</span>
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
  const [destCdi, setDestCdi] = useState('100')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCdi, setEditCdi] = useState('')

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
    const cdi = parseCdi(destCdi)
    if (cdi === undefined) return setMsg('% do CDI inválido. Use um número, ex.: 100 ou 110,5 (ou deixe vazio).')
    run(
      supabase.from('destinations').insert({ name: destName.trim(), kind: destKind, cdi_percent: cdi }),
      'Destino adicionado!',
    )
    setDestName('')
  }

  function saveCdi(id: string) {
    const cdi = parseCdi(editCdi)
    if (cdi === undefined) return setMsg('% do CDI inválido.')
    run(supabase.from('destinations').update({ cdi_percent: cdi }).eq('id', id), 'Rendimento atualizado!')
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
        <h2 className="mb-3 font-semibold">Caixinhas e investimentos</h2>
        {destinations.length === 0 && <p className="mb-2 text-sm text-slate-500">Nenhum cadastrado.</p>}
        <ul className="mb-4 divide-y divide-slate-100">
          {destinations.map((d) => (
            <li key={d.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate">{d.kind === 'caixinha' ? '🐷' : '📈'} {d.name}</p>
                  <p className="text-xs text-slate-500">
                    {d.cdi_percent ? `${d.cdi_percent.toLocaleString('pt-BR')}% do CDI · rendimento automático` : 'Sem CDI · rendimento manual'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(editingId === d.id ? null : d.id)
                      setEditCdi(d.cdi_percent ? String(d.cdi_percent).replace('.', ',') : '')
                    }}
                    className="text-brand"
                  >
                    % CDI
                  </button>
                  <button type="button" onClick={() => removeDestination(d.id, d.name)} className="text-rose-600">
                    Remover
                  </button>
                </div>
              </div>
              {editingId === d.id && (
                <div className="mt-2 flex items-center gap-2">
                  <CdiInput value={editCdi} onChange={setEditCdi} />
                  <button type="button" onClick={() => saveCdi(d.id)} className={btn}>Salvar</button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={addDestination} className="space-y-2 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-medium">Nova caixinha / investimento</p>
          <input value={destName} onChange={(e) => setDestName(e.target.value)} className={input} placeholder="Ex.: Caixinha Nubank" />
          <select value={destKind} onChange={(e) => setDestKind(e.target.value as DestinationKind)} className={input}>
            <option value="caixinha">🐷 Caixinha</option>
            <option value="investimento">📈 Investimento</option>
          </select>
          <CdiInput value={destCdi} onChange={setDestCdi} />
          <p className="text-xs text-slate-500">
            Ex.: Caixinha Nubank = 100, CDB 110% = 110. Deixe vazio se não rende pelo CDI (ex.: ações). Aí o rendimento é lançado à mão.
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
