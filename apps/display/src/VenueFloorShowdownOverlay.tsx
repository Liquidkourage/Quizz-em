import { useId, type ReactNode } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import {
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import type { VenueFloorShowdownVariantId } from './venueFloorShowdownVariants'
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

function FeltGuessAnchor({ children }: { children: ReactNode }) {
  const felt = venueMosaicFeltCenterPct()
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[109]"
      aria-hidden
      style={{
        left: `${felt.leftPct}%`,
        top: `${felt.topPct}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {children}
    </div>
  )
}

/** 20 distinct large-number treatments on felt center (table stays visible). */
export function VenueFeltWinningGuessByVariant({
  guess,
  variantId,
  splitWin,
}: {
  guess: string
  variantId: VenueFloorShowdownVariantId
  splitWin?: boolean
}) {
  const base =
    'max-w-[82%] text-center font-mono font-black tabular-nums leading-none tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]'

  const body = (() => {
    switch (variantId) {
      case 1:
        return <p className={`${base} text-amber-50 text-[clamp(1.15rem,22cqw,2.65rem)]`}>{guess}</p>
      case 2:
        return (
          <p className={`${base} text-amber-50 text-[clamp(1.35rem,26cqw,2.85rem)]`}>{guess}</p>
        )
      case 3:
        return (
          <>
            <p className={`${base} text-amber-500/14 text-[clamp(1.2rem,24cqw,2.5rem)]`}>{guess}</p>
            <p className={`${base} absolute inset-0 text-amber-50 text-[clamp(1.15rem,22cqw,2.65rem)]`}>
              {guess}
            </p>
          </>
        )
      case 4:
        return (
          <p
            className={`${base} bg-gradient-to-b from-yellow-200 via-amber-100 to-yellow-600 bg-clip-text text-transparent text-[clamp(1.2rem,23cqw,2.7rem)]`}
          >
            {guess}
          </p>
        )
      case 5:
        return (
          <p
            className={`${base} text-cyan-100 text-[clamp(1.15rem,22cqw,2.6rem)]`}
            style={{ textShadow: '0 0 8px rgba(34,211,238,0.55), 0 2px 8px rgba(0,0,0,0.9)' }}
          >
            {guess}
          </p>
        )
      case 6:
        return (
          <div className="flex items-center justify-center rounded-full border-2 border-amber-400/55 bg-black/25 px-[0.35em] py-[0.2em]">
            <p className={`${base} text-amber-50 text-[clamp(1.1rem,20cqw,2.45rem)]`}>{guess}</p>
          </div>
        )
      case 7:
        return (
          <div className="flex flex-col items-center gap-0.5">
            {guess.split('').map((ch, i) => (
              <span
                key={i}
                className="flex h-[1.05rem] w-[1.05rem] items-center justify-center rounded border border-amber-400/50 bg-black/40 font-mono text-[0.62rem] font-black text-amber-50"
              >
                {ch}
              </span>
            ))}
          </div>
        )
      case 8:
        return (
          <p className={`${base} text-amber-50 tracking-[0.22em] text-[clamp(1rem,20cqw,2.35rem)]`}>
            {guess}
          </p>
        )
      case 9:
        return (
          <p className={`${base} translate-y-[8%] text-yellow-300 text-[clamp(1.2rem,23cqw,2.7rem)]`}>
            {guess}
          </p>
        )
      case 10:
        return (
          <p className={`${base} text-emerald-100 text-[clamp(1.15rem,22cqw,2.6rem)]`}>{guess}</p>
        )
      case 11:
        return (
          <p
            className={`${base} text-amber-50 text-[clamp(1.15rem,22cqw,2.55rem)]`}
            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.35), 0 3px 12px rgba(0,0,0,0.95)' }}
          >
            {guess}
          </p>
        )
      case 12:
        return (
          <p
            className={`${base} text-[clamp(1.15rem,22cqw,2.6rem)] ${splitWin ? 'text-rose-100' : 'text-amber-50'}`}
          >
            {guess}
          </p>
        )
      case 13:
        return (
          <div className="flex flex-col items-center">
            <p className={`${base} text-amber-50 text-[clamp(1.15rem,22cqw,2.55rem)]`}>{guess}</p>
            <span className="mt-0.5 h-px w-[70%] bg-amber-400/70" aria-hidden />
          </div>
        )
      case 14:
        return (
          <div className="relative">
            <p className={`${base} text-amber-50 text-[clamp(1.15rem,22cqw,2.55rem)]`}>{guess}</p>
            <span
              className="absolute -inset-x-[18%] -inset-y-[22%] rounded-full border border-amber-300/25"
              aria-hidden
            />
          </div>
        )
      case 15:
        return (
          <div className="rounded-md bg-black/45 px-2 py-1">
            <p className={`${base} text-yellow-300 text-[clamp(1.1rem,21cqw,2.5rem)]`}>{guess}</p>
          </div>
        )
      case 16:
        return (
          <p className={`${base} text-yellow-300 text-[clamp(1.25rem,24cqw,2.75rem)]`}>{guess}</p>
        )
      case 17:
        return (
          <p className={`${base} text-amber-50/95 text-[clamp(1rem,18cqw,2.2rem)]`}>{guess}</p>
        )
      case 18:
        return (
          <p className={`${base} text-amber-50 text-[clamp(1.45rem,28cqw,3rem)]`}>{guess}</p>
        )
      case 19:
        return (
          <p className={`${base} skew-x-[-6deg] text-amber-100 text-[clamp(1.15rem,22cqw,2.6rem)]`}>
            {guess}
          </p>
        )
      case 20:
        return (
          <div className="flex flex-col items-center gap-0.5">
            <p className={`${base} text-white text-[clamp(1.15rem,22cqw,2.55rem)]`}>{guess}</p>
            <span className="text-[0.38rem] font-bold uppercase tracking-[0.28em] text-white/55">
              Answer
            </span>
          </div>
        )
      default:
        return <p className={`${base} text-amber-50 text-[clamp(1.15rem,22cqw,2.65rem)]`}>{guess}</p>
    }
  })()

  return <FeltGuessAnchor>{body}</FeltGuessAnchor>
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
