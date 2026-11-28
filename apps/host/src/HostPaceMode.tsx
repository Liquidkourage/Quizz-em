import { venuePaceFrom, type VenuePace } from '@qhe/core'

const CHOICES: { id: VenuePace; label: string; detail: string }[] = [
  {
    id: 'sync',
    label: 'Together',
    detail: 'Every table waits for the same beat. You deal the public cards and open guessing for the room.',
  },
  {
    id: 'async',
    label: 'On their own',
    detail: 'You still start the question. Each table then deals and opens guessing when its own betting is done. Everyone still waits together for the answer.',
  },
]

/** Host switch between one shared beat and tables that move until the answer. */
export function HostPaceMode({
  pace,
  onChoose,
}: {
  pace: unknown
  onChoose: (pace: VenuePace) => void
}) {
  const current = venuePaceFrom(pace)
  return (
    <section className="space-y-3" aria-label="Table pace">
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
