import { useId } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import {
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import {
  mosaicSeatDotPct,
  venueMosaicFeltCenterPct,
} from './venueMosaicSeatGeometry'

export type FloorShowdownPresentation = {
  label: string
  winners: ShowdownResultRow[]
  guess: string | null
  winnerSeatIndexes: ReadonlySet<number>
  ariaLabel: string
}

export function buildFloorShowdownPresentation(
  rows: ShowdownResultRow[],
  correctAnswer: number | undefined
): FloorShowdownPresentation | null {
  const { winnerKeys } = sortShowdownRowsByDistance(rows, correctAnswer)
  const winners = rows.filter(
    (r) =>
      winnerKeys.has(`${r.seat}:${r.name}`) &&
      r.name.trim() !== '' &&
      !r.hasFolded
  )
  if (winners.length === 0) return null

  const chipRow = pickShowdownFloorChipRow(winners)
  const label = winners.length > 1 ? 'Split winners' : 'Winner'
  const guess =
    chipRow?.submitted != null && typeof correctAnswer === 'number'
      ? formatTriviaNumber(chipRow.submitted)
      : null

  const winnerSeatIndexes = new Set<number>()
  for (const w of winners) winnerSeatIndexes.add(w.seat - 1)

  return {
    label,
    winners,
    guess,
    winnerSeatIndexes,
    ariaLabel: `${label}: ${winners.map((w) => w.name).join(', ')}`,
  }
}

/** Large winning guess centered on the green felt (table stays visible). */
export function VenueFeltCenterWinningGuess({ guess }: { guess: string }) {
  const felt = venueMosaicFeltCenterPct()
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[109] flex items-center justify-center"
      aria-hidden
    >
      <p
        className="max-w-[78%] text-center font-mono font-black tabular-nums leading-none tracking-tight text-amber-50 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] text-[clamp(1.15rem,22cqw,2.65rem)]"
        style={{
          position: 'absolute',
          left: `${felt.leftPct}%`,
          top: `${felt.topPct}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {guess}
      </p>
    </div>
  )
}

/** Arrows from felt center to each winning seat (mosaic ring coordinates). */
export function VenueFloorWinnerArrows({
  seatedCount,
  winnerSeatIndexes,
  ringW,
  ringH,
}: {
  seatedCount: number
  winnerSeatIndexes: ReadonlySet<number>
  ringW: number
  ringH: number
}) {
  const uid = useId()
  const markerId = `${uid}-winner-arrow`
  const center = venueMosaicFeltCenterPct()
  const cx = center.leftPct
  const cy = center.topPct

  const arrows = Array.from(winnerSeatIndexes)
    .filter((i) => i >= 0 && i < seatedCount)
    .map((seatIndex) => {
      const seat = mosaicSeatDotPct(seatIndex, seatedCount, ringW, ringH)
      const dx = seat.leftPct - cx
      const dy = seat.topPct - cy
      const t = 0.86
      return {
        seatIndex,
        x1: cx,
        y1: cy,
        x2: cx + dx * t,
        y2: cy + dy * t,
      }
    })

  if (arrows.length === 0) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[15] overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="3.5"
          markerHeight="3.5"
          refX="2.8"
          refY="1.75"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L3.5,1.75 L0,3.5 Z" fill="rgba(252,211,77,0.95)" />
        </marker>
      </defs>
      {arrows.map((a) => (
        <line
          key={a.seatIndex}
          x1={a.x1}
          y1={a.y1}
          x2={a.x2}
          y2={a.y2}
          stroke="rgba(251,191,36,0.82)"
          strokeWidth="0.55"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
          style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.65))' }}
        />
      ))}
    </svg>
  )
}

/** Compact winner line above the felt — does not cover the table. */
export function VenueFloorShowdownCaption({
  presentation,
}: {
  presentation: FloorShowdownPresentation
}) {
  const names = presentation.winners.map((w) => w.name).join(' · ')
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[122] flex justify-center px-[6%] pt-[3%]"
      role="group"
      aria-label={presentation.ariaLabel}
    >
      <div className="max-w-full rounded-md border border-amber-400/40 bg-black/50 px-2 py-0.5 text-center shadow-[0_2px_10px_rgba(0,0,0,0.45)] backdrop-blur-[2px]">
        <p className="text-[0.38rem] font-bold uppercase tracking-[0.18em] text-amber-200/80">
          {presentation.label}
        </p>
        <p className="truncate text-[0.44rem] font-semibold leading-tight text-amber-50/95">
          {names}
        </p>
      </div>
    </div>
  )
}
