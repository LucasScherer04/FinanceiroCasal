import type { Profile } from '../types'

interface Props {
  target: number
  parts: { profile: Profile; value: number }[]
}

/** Barra empilhada: cada pessoa ocupa sua fatia, na sua cor. */
export function ProgressBar({ target, parts }: Props) {
  return (
    <div className="h-5 w-full overflow-hidden rounded-full bg-white/25 flex">
      {parts.map(({ profile, value }) => {
        const pct = Math.max(0, Math.min(100, (value / target) * 100))
        return (
          <div
            key={profile.id}
            className="h-full transition-all duration-700 first:rounded-l-full"
            style={{ width: `${pct}%`, background: profile.color }}
            title={profile.name}
          />
        )
      })}
    </div>
  )
}
