import { ChipMark } from '@qhe/ui'
import { formatVenueBankroll, formatVenueBankrollDigits } from './venueLeaderboard'
import { mosaicSeatDotPct } from './venueMosaicSeatGeometry'

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

/** Em width of a gold amount such as $10,000, including the chip mark. */
const MOSAIC_STACK_LABEL_EM = 4.6

/** Five or more stacks on one felt — each amount has to fit between its neighbors. */
const MOSAIC_CROWDED_SEAT_COUNT = 5

function neighborCupGapPx(w: number, h: number): number {
  let minGap = Infinity
  for (let i = 0; i < 8; i++) {
    const a = mosaicSeatDotPct(i, 8, w, h)
    const b = mosaicSeatDotPct((i + 1) % 8, 8, w, h)
    const gap = Math.hypot(((a.leftPct - b.leftPct) / 100) * w, ((a.topPct - b.topPct) / 100) * h)
    if (gap < minGap) minGap = gap
  }
  return minGap
}

/** Stack amount on the green. A full table uses a size that fits the seat gap. */
export function mosaicSeatStackFontPx(tableWidthPx: number, filledSeats = 0): number {
  const w = feltWidthPx(tableWidthPx)
  const room = Math.round(Math.min(36, Math.max(24, w * 0.072)))
  if (filledSeats < MOSAIC_CROWDED_SEAT_COUNT) return room
  const gap = neighborCupGapPx(w, Math.round(w * (140 / 264)))
  const fitted = Math.floor((gap * 0.9) / MOSAIC_STACK_LABEL_EM)
  return Math.min(room, Math.max(16, fitted))
}

/** Rail-facing edge of the amount, past the initials that spill off the cup. */
export function mosaicSeatStackClearPx(cupSizePx: number, initialFontPx: number): number {
  const cup = Math.max(8, Math.round(cupSizePx))
  const pastGlyph = Math.round(initialFontPx * 0.72 + 8)
  return Math.max(cup, pastGlyph)
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
