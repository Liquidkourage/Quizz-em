import { formatTriviaNumber } from '@qhe/core'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import {
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import {
  resolveShowdownSidePotLines,
  SidePotRibbon,
  SplitPotRibbon,
  WinnerRibbon,
  ShowdownPotWinnerList,
  type ShowdownSidePotLine,
} from './venueFloorSidePotDisplay'

/** Locked layout id (only floor stack ships). */
export type VenueFloorShowdownVariantId = 8

/**
 * Locked venue-floor showdown overlay (mosaic tiles).
 * - Side pot: cyan ribbon + type · $amount · winner rows + compact digit cards
 * - Single winner: amber Winner ribbon + name + pot + digit cards
 * - Split pot: gradient ribbon + names + $N each + digit cards
 */

export type FloorShowdownCtx = {
  pot: number
  label: string
  winners: ShowdownResultRow[]
  chipRow: ShowdownResultRow | null
  namePills: ShowdownResultRow[]
  extraWinners: number
  splitWin: boolean
  ariaLabel: string
  sidePotLines: ShowdownSidePotLine[] | null
  correctAnswer: number | undefined
}

function formatPot(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
}

function buildCtx(
  pot: number,
  rows: ShowdownResultRow[],
  correctAnswer: number | undefined
): FloorShowdownCtx | null {
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
  const sidePotLines = resolveShowdownSidePotLines(rows, correctAnswer)
  const mainLine = sidePotLines?.find((l) => l.label === 'Main')
  const mainRow =
    mainLine != null
      ? rows.find((r) => r.name === mainLine.name && !r.hasFolded) ?? null
      : null
  const displayWinners = mainRow != null ? [mainRow] : winners
  const displayChipRow = pickShowdownFloorChipRow(displayWinners) ?? chipRow
  const displayPot = mainLine?.amount ?? pot
  const displaySplit = sidePotLines == null && winners.length > 1
  const namePills = displayWinners.slice(0, 4)
  const extraWinners = Math.max(0, winners.length - namePills.length)

  const layerSummary =
    sidePotLines != null
      ? sidePotLines.map((l) => `${l.label} ${formatPot(l.amount)} ${l.name}`).join(', ')
      : null
  const answerLabel =
    typeof correctAnswer === 'number' && Number.isFinite(correctAnswer)
      ? `Correct answer ${formatTriviaNumber(correctAnswer)}. `
      : ''

  return {
    pot: displayPot,
    label,
    winners: displayWinners,
    chipRow: displayChipRow,
    namePills,
    extraWinners,
    splitWin: displaySplit,
    sidePotLines,
    correctAnswer,
    ariaLabel:
      layerSummary != null
        ? `${answerLabel}Side pots: ${layerSummary}`
        : displaySplit
          ? `${answerLabel}${label}: ${winners.map((w) => w.name).join(', ')}. ${formatPot(displayPot)} each`
          : `${answerLabel}${label}: ${winners.map((w) => w.name).join(', ')}. Pot ${formatPot(displayPot)}`,
  }
}

const WINNER_NAME_SINGLE =
  'min-w-0 font-black leading-[1.05] text-amber-50 text-[clamp(1.12rem,13.5cqw,2.5rem)]'
const WINNER_NAME_SPLIT =
  'min-w-0 font-black leading-[1.05] text-amber-50 text-[clamp(0.88rem,10.2cqw,1.85rem)]'

function winnerNameClass(splitWin: boolean): string {
  return splitWin ? WINNER_NAME_SPLIT : WINNER_NAME_SINGLE
}

const POT_AMOUNT =
  'font-mono font-black tabular-nums leading-none text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-[clamp(1.05rem,11cqw,2.4rem)]'

function HeroPot({ pot, splitWin = false }: { pot: number; splitWin?: boolean }) {
  if (pot <= 0) return null
  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center gap-[0.35em]">
        <p className={POT_AMOUNT}>{formatPot(pot)}</p>
        {splitWin ? (
          <span className="shrink-0 font-bold uppercase tracking-[0.18em] text-yellow-200/90 text-[clamp(0.48rem,4.5cqw,0.68rem)]">
            each
          </span>
        ) : null}
      </div>
    </div>
  )
}

function WinnerBlock({ ctx, layout = 'line' }: { ctx: FloorShowdownCtx; layout?: 'pills' | 'line' }) {
  const nameClass = winnerNameClass(ctx.splitWin)
  if (layout === 'line') {
    return (
      <div className="min-w-0 text-center">
        <p className={`${nameClass} truncate`}>
          {ctx.winners.map((w) => w.name).join(' · ')}
          {ctx.extraWinners > 0 ? ` +${ctx.extraWinners}` : ''}
        </p>
      </div>
    )
  }
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <div className="flex max-w-full flex-wrap justify-center gap-1">
        {ctx.namePills.map((w) => (
          <span
            key={`${w.seat}:${w.name}`}
            className="inline-flex max-w-full min-w-0 rounded-full border-2 border-amber-400/80 bg-amber-950/95 px-2 py-0.5 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
          >
            <span className={`${nameClass} truncate`}>{w.name}</span>
          </span>
        ))}
      </div>
      {ctx.extraWinners > 0 ? (
        <p className="text-[clamp(0.55rem,5cqw,0.75rem)] font-bold text-amber-200/80">+{ctx.extraWinners} more</p>
      ) : null}
    </div>
  )
}

function GuessBlock(ctx: FloorShowdownCtx) {
  if (!ctx.chipRow) return null
  return (
    <ShowdownFiveCardsUsed
      row={ctx.chipRow}
      size={ctx.sidePotLines != null ? 'floor-compact' : 'floor'}
    />
  )
}

function FloorPotBlock(ctx: FloorShowdownCtx) {
  if (ctx.sidePotLines != null) {
    return <ShowdownPotWinnerList lines={ctx.sidePotLines} />
  }
  return <HeroPot pot={ctx.pot} splitWin={ctx.splitWin} />
}

const FLOOR_ANSWER_LABEL =
  'font-bold uppercase tracking-[0.14em] text-emerald-300/75 text-[clamp(0.42rem,3.8cqw,0.55rem)]'
const FLOOR_ANSWER_VALUE =
  'font-mono font-black tabular-nums leading-none text-emerald-100 text-[clamp(0.72rem,7.2cqw,1.2rem)]'
const FLOOR_ANSWER_VALUE_COMPACT =
  'font-mono font-black tabular-nums leading-none text-emerald-100 text-[clamp(0.62rem,6.2cqw,1.05rem)]'

function FloorCorrectAnswer({
  answer,
  compact = false,
}: {
  answer: number | undefined
  compact?: boolean
}) {
  if (typeof answer !== 'number' || !Number.isFinite(answer)) return null
  return (
    <div className="flex shrink-0 flex-col items-center gap-px pb-0.5 text-center">
      <span className={FLOOR_ANSWER_LABEL}>Answer</span>
      <span className={compact ? FLOOR_ANSWER_VALUE_COMPACT : FLOOR_ANSWER_VALUE}>
        {formatTriviaNumber(answer)}
      </span>
    </div>
  )
}

function ShowdownStack({ ctx, className = '' }: { ctx: FloorShowdownCtx; className?: string }) {
  const sidePot = ctx.sidePotLines != null
  if (sidePot) {
    return (
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col items-center ${className}`}>
        <div className="flex w-full min-h-0 flex-1 items-stretch justify-center overflow-hidden pb-1">
          {FloorPotBlock(ctx)}
        </div>
        <div className="flex w-full shrink-0 flex-col items-center gap-0.5 pb-1.5 pt-0.5">
          <FloorCorrectAnswer answer={ctx.correctAnswer} compact />
          {GuessBlock(ctx)}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col items-center ${className}`}>
      <div className="flex w-full min-h-0 flex-1 items-end justify-center pb-2">
        <WinnerBlock ctx={ctx} layout="line" />
      </div>
      <div className="w-full shrink-0 py-2.5">{FloorPotBlock(ctx)}</div>
      <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden gap-1 pt-1">
        <FloorCorrectAnswer answer={ctx.correctAnswer} />
        {GuessBlock(ctx)}
      </div>
    </div>
  )
}

export function VenueFloorShowdownByVariant({
  pot,
  rows,
  correctAnswer,
}: {
  tableNum?: number
  pot: number
  rows: ShowdownResultRow[]
  correctAnswer: number | undefined
  labMode?: boolean
}) {
  const ctx = buildCtx(pot, rows, correctAnswer)
  if (ctx == null) return null

  const sidePot = ctx.sidePotLines != null

  return (
    <div
      className="@container pointer-events-none absolute inset-0 z-[125] flex flex-col overflow-hidden rounded-[inherit] bg-gradient-to-b from-black/72 via-black/78 to-black/85 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]"
      role="group"
      aria-label={ctx.ariaLabel}
    >
      {ctx.sidePotLines != null ? <SidePotRibbon /> : null}
      {!ctx.splitWin && ctx.sidePotLines == null ? <WinnerRibbon /> : null}
      {ctx.splitWin && ctx.sidePotLines == null ? <SplitPotRibbon /> : null}
      <div
        className={`flex min-h-0 flex-1 flex-col ${sidePot ? 'px-2 py-1.5' : 'px-2.5 py-3'}`}
      >
        <ShowdownStack ctx={ctx} className="min-h-0 flex-1 justify-center" />
      </div>
    </div>
  )
}

