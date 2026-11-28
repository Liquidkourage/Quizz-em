import { holeDealFrom, type HoleDeal } from '@qhe/core'

const CHOICES: { id: HoleDeal; label: string; detail: string }[] = [
  {
    id: 'host',
    label: 'You deal them',
    detail: 'The hole cards wait until you press Deal hole cards.',
  },
  {
    id: 'auto',
    label: '10 seconds later',
    detail: 'Ten seconds after the question is on the tables, the hole cards are dealt and betting opens.',
  },
]

/** Host switch for who deals the hole cards. */
export function HostHoleDeal({
  holeDeal,
  onChoose,
}: {
  holeDeal: unknown
  onChoose: (holeDeal: HoleDeal) => void
}) {
  const current = holeDealFrom(holeDeal)
  return (
    <section className="space-y-3" aria-label="Hole cards">
      <div className="flex flex-wrap gap-2">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            aria-pressed={current === choice.id}
            onClick={() => onChoose(choice.id)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-bold ${
              current === choice.id
                ? 'border-emerald-300 bg-emerald-900/70 text-white'
                : 'border-white/15 bg-black/35 text-white/80'
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-white/70">{CHOICES.find((choice) => choice.id === current)?.detail}</p>
    </section>
  )
}
