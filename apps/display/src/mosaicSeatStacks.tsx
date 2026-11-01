import { ChipMark } from '@qhe/ui'
import { formatVenueBankroll, formatVenueBankrollDigits } from './venueLeaderboard'

/** Lobby, the question beat, and breaks — felts with no live wagering. */
export function mosaicShowsSeatStacks(phase: string | null | undefined): boolean {
  const ph = String(phase ?? '').trim().toLowerCase()
  return ph === 'lobby' || ph === 'question' || ph === 'intermission'
}

function feltWidthPx(tableWidthPx: number): number {
  return tableWidthPx > 0 ? tableWidthPx : 220
}

/** Two-letter seat mark, sized from the felt so it reads across the room. */
export function mosaicSeatInitialFontPx(tableWidthPx: number): number {
  const w = feltWidthPx(tableWidthPx)
  return Math.round(Math.min(52, Math.max(30, w * 0.105)))
}

/** Stack amount on the green. Large enough to read across the room, short of the pot. */
export function mosaicSeatStackFontPx(tableWidthPx: number): number {
  const w = feltWidthPx(tableWidthPx)
  return Math.round(Math.min(36, Math.max(24, w * 0.072)))
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
  const digits = formatVenueBankrollDigits(amount)
  return (
    <span
      className="vfd-mosaic-seat-stack vfd-mosaic-stack whitespace-nowrap leading-none"
      style={{ fontSize: `${Math.max(1, Math.round(fontPx))}px` }}
      data-mosaic-seat-stack=""
      aria-label={`${name} stack ${label}`}
    >
      <span className="vfd-mosaic-dollar vfd-mosaic-dollar--live">
        <span className="vfd-mosaic-dollar-sign" aria-hidden>
          <ChipMark />
        </span>
        <span className="vfd-mosaic-dollar-digits">{digits}</span>
      </span>
    </span>
  )
}
