import { Link } from 'react-router'
import { EntryItem } from '../components/EntryItem'
import { Logo } from '../components/Logo'
import { ProgressBar } from '../components/ProgressBar'
import { useData } from '../hooks/useData'
import { useYields } from '../hooks/useYields'
import { formatBRL, formatDate, sumEntries } from '../lib/format'
import { DESTINATION_ICON, rateLabel } from '../types'

const pctFmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export function Dashboard() {
  const { goal, profiles, entries, destinations, me } = useData()
  const y = useYields()
  const target = goal?.target_amount ?? 100000
  const total = sumEntries(entries) + y.total
  const pct = Math.max(0, (total / target) * 100)
  const remaining = Math.max(0, target - total)

  const perPerson = profiles.map((p) => {
    const yieldValue = y.byUser(p.id)
    return {
      profile: p,
      yieldValue,
      value: sumEntries(entries.filter((e) => e.user_id === p.id)) + yieldValue,
    }
  })

  const perDestination = destinations
    .map((d) => {
      const yieldValue = y.byDest(d.id)
      return { d, yieldValue, value: sumEntries(entries.filter((e) => e.destination_id === d.id)) + yieldValue }
    })
    .filter((x) => Math.abs(x.value) >= 0.005)
    .sort((a, b) => b.value - a.value)

  return (
    <div>
      <header className="pt-safe rounded-b-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-5 pb-6 text-white">
        <div className="flex items-center gap-2 pt-5">
          <Logo className="h-8 w-8 drop-shadow" />
          <p className="text-sm font-medium opacity-90">{goal?.title ?? 'Nosso apartamento'}</p>
        </div>
        <p className="mt-3 text-4xl font-bold tabular-nums">{formatBRL(total)}</p>
        <p className="text-sm opacity-80">de {formatBRL(target)}</p>
        {y.total > 0.005 && (
          <p className="mt-1 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs">
            📈 +{formatBRL(y.total)} de rendimento
          </p>
        )}
        <div className="mt-4">
          <ProgressBar target={target} parts={perPerson} />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="font-semibold">{pct.toFixed(1).replace('.', ',')}%</span>
          <span className="opacity-90">
            {remaining > 0 ? `Faltam ${formatBRL(remaining)}` : 'Meta batida! 🎉'}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 px-4 pt-4">
        {perPerson.map(({ profile, value, yieldValue }) => (
          <div key={profile.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: profile.color }} />
              <span className="truncate text-sm font-medium">{profile.name}</span>
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums">{formatBRL(value)}</p>
            <p className="text-xs text-slate-500">
              {total > 0 ? Math.round((value / total) * 100) : 0}% do total
              {yieldValue > 0.005 && <span className="text-emerald-600"> · +{formatBRL(yieldValue)}</span>}
            </p>
          </div>
        ))}
      </section>

      {perDestination.length > 0 && (
        <section className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Onde está o dinheiro</h2>
          <div className="divide-y divide-slate-100">
            {perDestination.map(({ d, value, yieldValue }) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">
                    {DESTINATION_ICON[d.kind]} {d.name}
                  </p>
                  {rateLabel(d) ? (
                    <p className="text-xs text-slate-500">{rateLabel(d)}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium tabular-nums">{formatBRL(value)}</p>
                  {yieldValue > 0.005 && (
                    <p className="text-xs text-emerald-600 tabular-nums">+{formatBRL(yieldValue)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
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

      <p className="mx-6 mt-4 text-center text-xs text-slate-400">
        {y.status === 'loading' && 'Atualizando CDI…'}
        {y.status === 'error' && 'Não foi possível buscar o CDI agora; o rendimento será atualizado depois.'}
        {y.status === 'ok' &&
          y.cdiAnnual != null &&
          `Rendimento estimado, bruto (antes do IR). CDI ${pctFmt(y.cdiAnnual)}% a.a. · atualizado até ${y.lastRateDate ? formatDate(y.lastRateDate) : '—'}.`}
      </p>

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
