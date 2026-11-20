import { Link } from 'react-router'
import { EntryItem } from '../components/EntryItem'
import { ProgressBar } from '../components/ProgressBar'
import { useData } from '../hooks/useData'
import { formatBRL, sumEntries } from '../lib/format'

export function Dashboard() {
  const { goal, profiles, entries, destinations, me } = useData()
  const target = goal?.target_amount ?? 100000
  const total = sumEntries(entries)
  const pct = Math.max(0, (total / target) * 100)
  const remaining = Math.max(0, target - total)

  const perPerson = profiles.map((p) => ({
    profile: p,
    value: sumEntries(entries.filter((e) => e.user_id === p.id)),
  }))

  const perDestination = destinations
    .map((d) => ({ d, value: sumEntries(entries.filter((e) => e.destination_id === d.id)) }))
    .filter((x) => x.value !== 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div>
      <header className="pt-safe rounded-b-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-5 pb-6 text-white">
        <p className="pt-5 text-sm opacity-80">🏠 {goal?.title ?? 'Nosso apartamento'}</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{formatBRL(total)}</p>
        <p className="mb-4 text-sm opacity-80">de {formatBRL(target)}</p>
        <ProgressBar target={target} parts={perPerson} />
        <div className="mt-2 flex justify-between text-sm">
          <span className="font-semibold">{pct.toFixed(1).replace('.', ',')}%</span>
          <span className="opacity-90">
            {remaining > 0 ? `Faltam ${formatBRL(remaining)}` : 'Meta batida! 🎉'}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 px-4 pt-4">
        {perPerson.map(({ profile, value }) => (
          <div key={profile.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: profile.color }} />
              <span className="truncate text-sm font-medium">{profile.name}</span>
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums">{formatBRL(value)}</p>
            <p className="text-xs text-slate-500">
              {total > 0 ? Math.round((value / total) * 100) : 0}% do total
            </p>
          </div>
        ))}
      </section>

      {perDestination.length > 0 && (
        <section className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Onde está o dinheiro</h2>
          {perDestination.map(({ d, value }) => (
            <div key={d.id} className="flex justify-between py-1 text-sm">
              <span>
                {d.kind === 'caixinha' ? '🐷' : '📈'} {d.name}
              </span>
              <span className="font-medium tabular-nums">{formatBRL(value)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="mx-4 mt-4 rounded-2xl bg-white px-4 pt-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Últimos lançamentos</h2>
          <Link to="/historico" className="text-sm text-brand">Ver todos</Link>
        </div>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhum lançamento ainda. Toque no + para começar!</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.slice(0, 5).map((e) => (
              <EntryItem
                key={e.id}
                entry={e}
                profile={profiles.find((p) => p.id === e.user_id)}
                destination={destinations.find((d) => d.id === e.destination_id)}
                editable={e.user_id === me?.id}
              />
            ))}
          </div>
        )}
      </section>

      <Link
        to="/novo"
        aria-label="Novo lançamento"
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-lg active:bg-brand-dark"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        +
      </Link>
    </div>
  )
}
