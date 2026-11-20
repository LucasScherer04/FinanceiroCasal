import { useMemo, useState } from 'react'
import { EntryItem } from '../components/EntryItem'
import { useData } from '../hooks/useData'
import { formatBRL, formatMonth, sumEntries } from '../lib/format'
import { ENTRY_TYPE_LABEL, type Entry, type EntryType } from '../types'

export function History() {
  const { entries, profiles, destinations, me } = useData()
  const [person, setPerson] = useState('')
  const [type, setType] = useState<EntryType | ''>('')

  const groups = useMemo(() => {
    const filtered = entries.filter((e) => (!person || e.user_id === person) && (!type || e.type === type))
    const map = new Map<string, Entry[]>()
    for (const e of filtered) {
      const key = e.date.slice(0, 7)
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return [...map.entries()]
  }, [entries, person, type])

  const selectCls = 'flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm'

  return (
    <div className="pt-safe px-4">
      <h1 className="py-4 text-xl font-bold">Histórico</h1>
      <div className="mb-4 flex gap-2">
        <select value={person} onChange={(e) => setPerson(e.target.value)} className={selectCls}>
          <option value="">Todos</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as EntryType | '')} className={selectCls}>
          <option value="">Todos os tipos</option>
          {Object.entries(ENTRY_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {groups.length === 0 && <p className="py-10 text-center text-slate-500">Nada por aqui ainda.</p>}

      {groups.map(([month, list]) => (
        <section key={month} className="mb-4 rounded-2xl bg-white px-4 pt-3 shadow-sm">
          <div className="flex justify-between text-sm">
            <h2 className="font-semibold">{formatMonth(`${month}-01`)}</h2>
            <span className="font-medium tabular-nums text-slate-500">{formatBRL(sumEntries(list))}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {list.map((e) => (
              <EntryItem
                key={e.id}
                entry={e}
                profile={profiles.find((p) => p.id === e.user_id)}
                destination={destinations.find((d) => d.id === e.destination_id)}
                editable={e.user_id === me?.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
