import { useEffect, useState } from 'react'
import { acceptedStreetPlan, ORIGINAL_STREET_PLAN, PUBLIC_CARD_COUNT, SINGLE_STREET_PLAN, SPLIT_32_STREET_PLAN, streetPlanFrom } from '@qhe/core'

const PRESETS = [
  { id: 'original', label: 'Original', plan: [...ORIGINAL_STREET_PLAN] },
  { id: 'single', label: 'One street', plan: [...SINGLE_STREET_PLAN] },
  { id: 'split', label: '3 then 2', plan: [...SPLIT_32_STREET_PLAN] },
] as const

function samePlan(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((count, index) => count === b[index])
}

/** How many betting streets a hand has, and how many of the 5 public cards each street reveals. */
export function HostStreetPlan({
  plan,
  onApply,
}: {
  plan: readonly number[] | undefined
  onApply: (plan: number[]) => void
}) {
  const current = streetPlanFrom(plan)
  const [count, setCount] = useState(current.length)
  const [cards, setCards] = useState<number[]>(current)
  useEffect(() => {
    const next = streetPlanFrom(plan)
    setCount(next.length)
    setCards(next)
  }, [plan])
  const shown = cards.slice(0, count)
  while (shown.length < count) shown.push(0)
  const sum = shown.reduce((total, n) => total + n, 0)
  const ready = acceptedStreetPlan(shown)

  return (
    <section className="space-y-3" aria-label="Betting streets">
      <p className="text-sm text-white/70">
        This hand uses {PUBLIC_CARD_COUNT} public cards. Choose how many betting streets, and how many of those cards each street reveals.
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={samePlan(current, preset.plan)}
            onClick={() => onApply([...preset.plan])}
            className={`min-h-11 rounded-lg border px-3 text-sm font-bold ${
              samePlan(current, preset.plan)
                ? 'border-emerald-300 bg-emerald-900/70 text-white'
                : 'border-white/15 bg-black/35 text-white/80'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className="block text-sm text-white/80">
        Streets
        <input
          aria-label="Number of betting streets"
          type="number"
          min={1}
          max={PUBLIC_CARD_COUNT + 1}
          value={count}
          onChange={(event) => {
            const next = Math.min(PUBLIC_CARD_COUNT + 1, Math.max(1, Math.floor(Number(event.target.value) || 1)))
            setCount(next)
          }}
          className="mt-1 min-h-11 w-24 rounded-md border border-white/20 bg-zinc-950 px-2 text-white"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {shown.map((cardsOnStreet, index) => (
          <label key={index} className="text-sm text-white/80">
            Street {index + 1}
            <input
              aria-label={`Public cards on street ${index + 1}`}
              type="number"
              min={0}
              max={PUBLIC_CARD_COUNT}
              value={cardsOnStreet}
              onChange={(event) => {
                const next = Math.min(PUBLIC_CARD_COUNT, Math.max(0, Math.floor(Number(event.target.value) || 0)))
                setCards((currentCards) => {
                  const copy = currentCards.slice(0, count)
                  while (copy.length < count) copy.push(0)
                  copy[index] = next
                  return copy
                })
              }}
              className="mt-1 min-h-11 w-24 rounded-md border border-white/20 bg-zinc-950 px-2 text-white"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={ready == null}
        onClick={() => ready && onApply(ready)}
        className="min-h-11 rounded-lg border border-amber-300/50 bg-amber-950/50 px-3 text-sm font-bold text-amber-50 disabled:opacity-40"
      >
        {ready ? `Use ${shown.join(' + ')}` : `${sum} of ${PUBLIC_CARD_COUNT} public cards`}
      </button>
    </section>
  )
}
