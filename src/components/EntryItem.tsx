import { Link } from 'react-router'
import { formatBRL, formatDate, signedAmount } from '../lib/format'
import { ENTRY_TYPE_LABEL, type Destination, type Entry, type Profile } from '../types'

interface Props {
  entry: Entry
  profile?: Profile
  destination?: Destination
  editable: boolean
}

export function EntryItem({ entry, profile, destination, editable }: Props) {
  const value = signedAmount(entry)
  const content = (
    <div className="flex items-center gap-3 py-3">
      <div
        className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
        style={{ background: profile?.color ?? '#94a3b8' }}
      >
        {profile?.name.charAt(0).toUpperCase() ?? '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {ENTRY_TYPE_LABEL[entry.type]}
          {destination && <span className="text-slate-500 font-normal"> · {destination.name}</span>}
        </p>
        <p className="truncate text-sm text-slate-500">
          {profile?.name ?? 'Alguém'} · {formatDate(entry.date)}
          {entry.note && ` · ${entry.note}`}
        </p>
      </div>
      <p className={`shrink-0 font-semibold tabular-nums ${value < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
        {value < 0 ? '−' : '+'}
        {formatBRL(Math.abs(value))}
      </p>
    </div>
  )
  return editable ? (
    <Link to={`/editar/${entry.id}`} className="block active:bg-slate-50">
      {content}
    </Link>
  ) : (
    content
  )
}
