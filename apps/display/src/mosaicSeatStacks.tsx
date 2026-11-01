import { ChipText } from '@qhe/ui'
import { formatVenueBankroll } from './venueLeaderboard'

/** Lobby, the question beat, and breaks — felts with no live wagering. */
export function mosaicShowsSeatStacks(phase: string | null | undefined): boolean {
  const ph = String(phase ?? '').trim().toLowerCase()
  return ph === 'lobby' || ph === 'question' || ph === 'intermission'
}

export function MosaicSeatStackAmount({
  name,
  amount,
  fontPx,
}: {
  name: string
  amount: number
  fontPx: number
}) {
  const label = formatVenueBankroll(amount)
  return (
    <span
      className="whitespace-nowrap font-mono font-extrabold tabular-nums leading-none tracking-tight text-amber-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.95)]"
      style={{ fontSize: `${Math.max(12, Math.round(fontPx))}px` }}
      data-mosaic-seat-stack=""
      aria-label={`${name} stack ${label}`}
    >
      <ChipText text={label} />
    </span>
  )
}
