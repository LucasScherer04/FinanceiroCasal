import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { MoneyInput } from '../components/MoneyInput'
import { useData } from '../hooks/useData'
import { todayISO } from '../lib/format'
import { supabase } from '../lib/supabase'
import { ENTRY_TYPE_LABEL, type EntryType } from '../types'

const TYPES: EntryType[] = ['deposito', 'rendimento', 'retirada']

export function EntryForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { entries, destinations, goal, me, reload } = useData()
  const existing = id ? entries.find((e) => e.id === id) : undefined

  const [type, setType] = useState<EntryType>(existing?.type ?? 'deposito')
  const [cents, setCents] = useState(existing ? Math.round(existing.amount * 100) : 0)
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [destinationId, setDestinationId] = useState(existing?.destination_id ?? destinations[0]?.id ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (id && !existing) {
    return <p className="p-6 text-center text-slate-500">Lançamento não encontrado.</p>
  }
  if (existing && existing.user_id !== me?.id) {
    return <p className="p-6 text-center text-slate-500">Você só pode editar seus próprios lançamentos.</p>
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (cents <= 0) return setError('Informe um valor.')
    if (!goal) return setError('Nenhuma meta cadastrada. Rode o SQL inicial no Supabase.')
    setBusy(true)
    setError(null)
    const payload = {
      type,
      amount: cents / 100,
      date,
      destination_id: destinationId || null,
      note: note.trim() || null,
      goal_id: goal.id,
    }
    const { error } = existing
      ? await supabase.from('entries').update(payload).eq('id', existing.id)
      : await supabase.from('entries').insert(payload)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    await reload()
    navigate(-1)
  }

  async function remove() {
    if (!existing || !confirm('Apagar este lançamento?')) return
    setBusy(true)
    const { error } = await supabase.from('entries').delete().eq('id', existing.id)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    await reload()
    navigate(-1)
  }

  return (
    <form onSubmit={save} className="pt-safe px-4">
      <div className="flex items-center justify-between py-4">
        <button type="button" onClick={() => navigate(-1)} className="text-slate-500">Cancelar</button>
        <h1 className="font-semibold">{existing ? 'Editar lançamento' : 'Novo lançamento'}</h1>
        <span className="w-16" />
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200 p-1">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg py-2 text-sm font-medium ${type === t ? 'bg-white shadow-sm' : 'text-slate-600'}`}
          >
            {ENTRY_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className={`my-8 ${type === 'retirada' ? 'text-rose-600' : 'text-emerald-600'}`}>
        <MoneyInput cents={cents} onChange={setCents} />
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-sm text-slate-500">Onde</span>
          {destinations.length === 0 ? (
            <p className="mt-1 text-sm">
              Nenhuma caixinha cadastrada. <Link to="/ajustes" className="text-brand underline">Cadastrar</Link>
            </p>
          ) : (
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">— Não informar —</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.kind === 'caixinha' ? '🐷' : '📈'} {d.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="block">
          <span className="text-sm text-slate-500">Data</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-500">Observação (opcional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
            placeholder="Ex.: 13º salário"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <button
        disabled={busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white active:bg-brand-dark disabled:opacity-60"
      >
        {busy ? 'Salvando…' : 'Salvar'}
      </button>
      {existing && (
        <button type="button" onClick={remove} disabled={busy} className="mt-3 w-full py-3 text-rose-600">
          Apagar lançamento
        </button>
      )}
    </form>
  )
}
