import type { ReactNode } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import {
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import type { VenueFloorShowdownVariantId } from './venueFloorShowdownVariants'
import { venueMosaicFeltCenterPct } from './venueMosaicSeatGeometry'

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

type GuessCardTone =
  | 'amber'
  | 'gold'
  | 'cyan'
  | 'emerald'
  | 'rose'
  | 'yellow'
  | 'noir'
  | 'cream'

const GUESS_CARD_TONE: Record<
  GuessCardTone,
  { shell: string; text: string }
> = {
  amber: {
    shell: 'border-amber-400/60 bg-gradient-to-b from-amber-950/92 to-black/88',
    text: 'text-amber-50',
  },
  gold: {
    shell: 'border-yellow-400/55 bg-gradient-to-b from-yellow-900/85 to-amber-950/90',
    text: 'text-yellow-100',
  },
  cyan: {
    shell: 'border-cyan-400/50 bg-gradient-to-b from-cyan-950/88 to-black/90',
    text: 'text-cyan-100',
  },
  emerald: {
    shell: 'border-emerald-400/50 bg-gradient-to-b from-emerald-950/88 to-black/90',
    text: 'text-emerald-100',
  },
  rose: {
    shell: 'border-rose-400/55 bg-gradient-to-b from-rose-950/88 to-black/90',
    text: 'text-rose-100',
  },
  yellow: {
    shell: 'border-yellow-500/55 bg-gradient-to-b from-black/80 to-amber-950/85',
    text: 'text-yellow-300',
  },
  noir: {
    shell: 'border-white/35 bg-gradient-to-b from-neutral-900/95 to-black/95',
    text: 'text-white',
  },
  cream: {
    shell: 'border-amber-700/45 bg-gradient-to-b from-amber-100/92 to-amber-200/88',
    text: 'text-amber-950',
  },
}

function GuessNumberCard({
  tone,
  children,
  className = '',
  round = 'lg',
}: {
  tone: GuessCardTone
  children: ReactNode
  className?: string
  round?: 'lg' | 'full' | 'md'
}) {
  const t = GUESS_CARD_TONE[tone]
  const radius = round === 'full' ? 'rounded-full' : round === 'md' ? 'rounded-md' : 'rounded-lg'
  return (
    <div
      className={`border-2 px-[0.5em] py-[0.38em] shadow-[0_4px_16px_rgba(0,0,0,0.55)] ${radius} ${t.shell} ${className}`}
    >
      {children}
    </div>
  )
}

const GUESS_NUM =
  'font-mono font-black tabular-nums leading-none tracking-tight drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)]'

/** 20 distinct card-backed winning numbers on felt center. */
export function VenueFeltWinningGuessByVariant({
  guess,
  variantId,
  splitWin,
}: {
  guess: string
  variantId: VenueFloorShowdownVariantId
  splitWin?: boolean
}) {
  const body = (() => {
    switch (variantId) {
      case 1:
        return (
          <GuessNumberCard tone="amber">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.15rem,22cqw,2.65rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 2:
        return (
          <GuessNumberCard tone="amber" className="px-[0.55em] py-[0.42em]">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.35rem,26cqw,2.85rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 3:
        return (
          <GuessNumberCard tone="gold">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.15rem,22cqw,2.65rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 4:
        return (
          <GuessNumberCard tone="gold">
            <p
              className={`${GUESS_NUM} bg-gradient-to-b from-yellow-200 via-amber-100 to-yellow-600 bg-clip-text text-transparent text-[clamp(1.2rem,23cqw,2.7rem)]`}
            >
              {guess}
            </p>
          </GuessNumberCard>
        )
      case 5:
        return (
          <GuessNumberCard tone="cyan">
            <p className={`${GUESS_NUM} text-cyan-100 text-[clamp(1.15rem,22cqw,2.6rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 6:
        return (
          <GuessNumberCard tone="amber" round="full">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.1rem,20cqw,2.45rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 7:
        return (
          <GuessNumberCard tone="amber" className="!px-2 !py-1.5">
            <div className="flex flex-col items-center gap-0.5">
              {guess.split('').map((ch, i) => (
                <span
                  key={i}
                  className="flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded border border-amber-400/55 bg-black/50 font-mono text-[0.7rem] font-black text-amber-50"
                >
                  {ch}
                </span>
              ))}
            </div>
          </GuessNumberCard>
        )
      case 8:
        return (
          <GuessNumberCard tone="amber">
            <p className={`${GUESS_NUM} text-amber-50 tracking-[0.22em] text-[clamp(1rem,20cqw,2.35rem)]`}>
              {guess}
            </p>
          </GuessNumberCard>
        )
      case 9:
        return (
          <GuessNumberCard tone="yellow">
            <p className={`${GUESS_NUM} text-yellow-300 text-[clamp(1.2rem,23cqw,2.7rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 10:
        return (
          <GuessNumberCard tone="emerald">
            <p className={`${GUESS_NUM} text-emerald-100 text-[clamp(1.15rem,22cqw,2.6rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 11:
        return (
          <GuessNumberCard tone="amber">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.15rem,22cqw,2.55rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 12:
        return (
          <GuessNumberCard tone={splitWin ? 'rose' : 'amber'}>
            <p className={`${GUESS_NUM} text-[clamp(1.15rem,22cqw,2.6rem)] ${splitWin ? 'text-rose-100' : 'text-amber-50'}`}>
              {guess}
            </p>
          </GuessNumberCard>
        )
      case 13:
        return (
          <GuessNumberCard tone="amber">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.15rem,22cqw,2.55rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 14:
        return (
          <GuessNumberCard tone="amber" round="full">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.15rem,22cqw,2.55rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 15:
        return (
          <GuessNumberCard tone="yellow">
            <p className={`${GUESS_NUM} text-yellow-300 text-[clamp(1.1rem,21cqw,2.5rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 16:
        return (
          <GuessNumberCard tone="yellow" className="px-[0.6em] py-[0.45em]">
            <p className={`${GUESS_NUM} text-yellow-300 text-[clamp(1.25rem,24cqw,2.75rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 17:
        return (
          <GuessNumberCard tone="amber">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.45rem,28cqw,3rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 18:
        return (
          <GuessNumberCard tone="cream">
            <p className={`${GUESS_NUM} text-amber-950 text-[clamp(1.45rem,28cqw,3rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
      case 19:
        return (
          <GuessNumberCard tone="amber">
            <p className={`${GUESS_NUM} skew-x-[-4deg] text-amber-100 text-[clamp(1.15rem,22cqw,2.6rem)]`}>
              {guess}
            </p>
          </GuessNumberCard>
        )
      case 20:
        return (
          <GuessNumberCard tone="noir">
            <div className="flex flex-col items-center gap-0.5">
              <p className={`${GUESS_NUM} text-white text-[clamp(1.15rem,22cqw,2.55rem)]`}>{guess}</p>
              <span className="text-[0.4rem] font-bold uppercase tracking-[0.28em] text-white/55">Answer</span>
            </div>
          </GuessNumberCard>
        )
      default:
        return (
          <GuessNumberCard tone="amber">
            <p className={`${GUESS_NUM} text-amber-50 text-[clamp(1.15rem,22cqw,2.65rem)]`}>{guess}</p>
          </GuessNumberCard>
        )
    }
  })()

  return <FeltGuessAnchor>{body}</FeltGuessAnchor>
}
