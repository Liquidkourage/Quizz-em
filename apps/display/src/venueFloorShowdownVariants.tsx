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

  return {
    pot: displayPot,
    label,
    winners: displayWinners,
    chipRow: displayChipRow,
    namePills,
    extraWinners,
    splitWin: displaySplit,
    sidePotLines,
    ariaLabel:
      layerSummary != null
        ? `Side pots: ${layerSummary}`
        : displaySplit
          ? `${label}: ${winners.map((w) => w.name).join(', ')}. ${formatPot(displayPot)} each`
          : `${label}: ${winners.map((w) => w.name).join(', ')}. Pot ${formatPot(displayPot)}`,
  }
}

import {
  DISPLAY_TEXT_PRIMARY_CQW,
  DISPLAY_TEXT_SECONDARY_CQW,
} from './displayTypography'

const WINNER_NAME_SINGLE =
  `min-w-0 font-black leading-[1.05] text-amber-50 ${DISPLAY_TEXT_PRIMARY_CQW}`
const WINNER_NAME_SPLIT =
  `min-w-0 font-black leading-[1.05] text-amber-50 ${DISPLAY_TEXT_PRIMARY_CQW}`

function winnerNameClass(splitWin: boolean): string {
  return splitWin ? WINNER_NAME_SPLIT : WINNER_NAME_SINGLE
}

const POT_AMOUNT =
  `font-mono font-black tabular-nums leading-none text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] ${DISPLAY_TEXT_PRIMARY_CQW}`

function HeroPot({ pot, splitWin = false }: { pot: number; splitWin?: boolean }) {
  if (pot <= 0) return null
  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center gap-[0.35em]">
        <p className={POT_AMOUNT}>{formatPot(pot)}</p>
        {splitWin ? (
          <span className={`shrink-0 font-bold uppercase tracking-[0.18em] text-yellow-200/90 ${DISPLAY_TEXT_SECONDARY_CQW}`}>
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
        <p className="text-[clamp(0.65rem,6cqw,0.9rem)] font-bold text-amber-200/80">+{ctx.extraWinners} more</p>
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

function ShowdownStack({ ctx, className = '' }: { ctx: FloorShowdownCtx; className?: string }) {
  if (ctx.sidePotLines != null) {
    return (
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col items-center ${className}`}>
        <div className="flex w-full min-h-0 flex-1 items-stretch justify-center overflow-hidden pb-2">
          {FloorPotBlock(ctx)}
        </div>
        <div className="flex w-full shrink-0 items-end justify-center pb-1.5 pt-0.5">
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
      <div className="flex w-full min-h-0 flex-1 items-start justify-center overflow-hidden pt-2">
        {GuessBlock(ctx)}
      </div>
    </div>
  )
}

export function VenueFloorShowdownByVariant({
  tableNum,
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
  const ariaLabel =
    tableNum != null ? `Table ${tableNum}. ${ctx.ariaLabel}` : ctx.ariaLabel

  return (
    <div
      className="@container pointer-events-none absolute inset-0 z-[125] flex flex-col overflow-hidden rounded-[inherit] bg-gradient-to-b from-black/72 via-black/78 to-black/85 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]"
      role="group"
      aria-label={ariaLabel}
    >
      {ctx.sidePotLines != null ? <SidePotRibbon tableNum={tableNum} /> : null}
      {!ctx.splitWin && ctx.sidePotLines == null ? <WinnerRibbon tableNum={tableNum} /> : null}
      {ctx.splitWin && ctx.sidePotLines == null ? <SplitPotRibbon tableNum={tableNum} /> : null}
      <div
        className={`flex min-h-0 flex-1 flex-col ${sidePot ? 'px-2 py-1.5' : 'px-2.5 py-3'}`}
      >
        <ShowdownStack ctx={ctx} className="min-h-0 flex-1 justify-center" />
      </div>
    </div>
  )
}

