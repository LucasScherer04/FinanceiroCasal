import { formatBRL } from '../lib/format'

interface Props {
  cents: number
  onChange: (cents: number) => void
}

/** Campo de valor estilo app de banco: digita só números e preenche da direita. */
export function MoneyInput({ cents, onChange }: Props) {
  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      className="w-full bg-transparent text-center text-4xl font-bold tabular-nums outline-none"
      value={formatBRL(cents / 100)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
        onChange(Number(digits || '0'))
      }}
    />
  )
}
