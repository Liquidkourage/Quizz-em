import { Fragment } from 'react'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import { ShowdownLaurelWreath } from './ShowdownLaurelWreath'
import {
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import {
  resolveShowdownSidePotLines,
  SidePotRibbon,
  SplitPotRibbon,
  WinnerTitleStrip,
  ShowdownPotWinnerList,
  type ShowdownSidePotLine,
} from './venueFloorSidePotDisplay'

/** Locked layout id (only floor stack ships). */
export type VenueFloorShowdownVariantId = 8

export type FloorShowdownCardVariant = 'winner' | 'split' | 'side'

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
  variant: FloorShowdownCardVariant
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

  const variant: FloorShowdownCardVariant =
    sidePotLines != null ? 'side' : displaySplit ? 'split' : 'winner'

  return {
    pot: displayPot,
    label,
    winners: displayWinners,
    chipRow: displayChipRow,
    namePills,
    extraWinners,
    splitWin: displaySplit,
    sidePotLines,
    variant,
    ariaLabel:
      layerSummary != null
        ? `Side pots: ${layerSummary}`
        : displaySplit
          ? `${label}: ${winners.map((w) => w.name).join(', ')}. ${formatPot(displayPot)} each`
          : `${label}: ${winners.map((w) => w.name).join(', ')}. Pot ${formatPot(displayPot)}`,
  }
}

const WINNER_NAME_SINGLE =
  'min-w-0 font-black leading-[1.05] text-amber-50 text-[clamp(1.32rem,16.2cqw,3rem)]'
const WINNER_NAME_SPLIT =
  'min-w-0 font-black leading-[1.08] text-amber-50 text-[clamp(1.08rem,12.8cqw,2.35rem)]'

const POT_AMOUNT =
  'font-mono font-black tabular-nums leading-none text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-[clamp(1.25rem,13.2cqw,2.85rem)]'

const POT_EACH =
  'shrink-0 font-bold uppercase tracking-[0.14em] text-yellow-200/95 text-[clamp(0.82rem,7.2cqw,1.12rem)]'

const RESULT_GAP = 'gap-y-[clamp(0.2rem,2.4cqw,0.5rem)]'
const ANSWER_GAP = 'pt-[clamp(0.2rem,2cqw,0.45rem)]'

function GuessBlock({ chipRow }: { chipRow: ShowdownResultRow | null }) {
  if (!chipRow) return null
  return (
    <div
      className="relative flex w-full max-w-full items-center justify-center"
      data-showdown-laurel-wrap
    >
      <ShowdownLaurelWreath className="absolute inset-x-[2%] top-[-18%] h-[clamp(2.4rem,34cqw,4.5rem)] w-[min(100%,26rem)] max-w-none -translate-y-[8%]" />
      <div className="relative z-10 w-full px-[10%] pt-[clamp(0.55rem,4.5cqw,1rem)]">
        <ShowdownFiveCardsUsed row={chipRow} size="floor" />
      </div>
    </div>
  )
}

function ShowdownWinnerCardContent({ ctx }: { ctx: FloorShowdownCtx }) {
  const name = ctx.winners[0]?.name ?? ''
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-2.5 ${RESULT_GAP}`}
    >
      <p className={`${WINNER_NAME_SINGLE} max-w-full truncate text-center`}>{name}</p>
      {ctx.pot > 0 ? (
        <div className="text-center">
          <p className={POT_AMOUNT}>{formatPot(ctx.pot)}</p>
        </div>
      ) : null}
      <div className={`flex w-full shrink-0 items-center justify-center ${ANSWER_GAP}`}>
        <GuessBlock chipRow={ctx.chipRow} />
      </div>
    </div>
  )
}

function ShowdownSplitPotCardContent({ ctx, allWinners }: { ctx: FloorShowdownCtx; allWinners: ShowdownResultRow[] }) {
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-2.5 ${RESULT_GAP}`}
    >
      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center">
        {allWinners.map((w, index) => (
          <Fragment key={`${w.seat}:${w.name}`}>
            {index > 0 ? (
              <span className="shrink-0 text-amber-200/55" aria-hidden>
                ·
              </span>
            ) : null}
            <span className={`${WINNER_NAME_SPLIT} max-w-[min(100%,14rem)] truncate`}>{w.name}</span>
          </Fragment>
        ))}
      </div>
      {ctx.pot > 0 ? (
        <div className="flex items-baseline justify-center gap-[0.4em]">
          <p className={POT_AMOUNT}>{formatPot(ctx.pot)}</p>
          <span className={POT_EACH}>each</span>
        </div>
      ) : null}
      <div className={`flex w-full shrink-0 items-center justify-center ${ANSWER_GAP}`}>
        <GuessBlock chipRow={ctx.chipRow} />
      </div>
    </div>
  )
}

function ShowdownSidePotCardContent({ ctx }: { ctx: FloorShowdownCtx }) {
  if (ctx.sidePotLines == null) return null
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-2 ${RESULT_GAP}`}
    >
      <div className="w-full max-w-full shrink-0">
        <ShowdownPotWinnerList lines={ctx.sidePotLines} />
      </div>
      <div className={`flex w-full shrink-0 items-center justify-center ${ANSWER_GAP}`}>
        <GuessBlock chipRow={ctx.chipRow} />
      </div>
    </div>
  )
}

function ShowdownCardBody({ ctx, allWinners }: { ctx: FloorShowdownCtx; allWinners: ShowdownResultRow[] }) {
  switch (ctx.variant) {
    case 'side':
      return <ShowdownSidePotCardContent ctx={ctx} />
    case 'split':
      return <ShowdownSplitPotCardContent ctx={ctx} allWinners={allWinners} />
    default:
      return <ShowdownWinnerCardContent ctx={ctx} />
  }
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

  const { winnerKeys } = sortShowdownRowsByDistance(rows, correctAnswer)
  const allWinners = rows.filter(
    (r) =>
      winnerKeys.has(`${r.seat}:${r.name}`) &&
      r.name.trim() !== '' &&
      !r.hasFolded
  )

  const ariaLabel =
    tableNum != null ? `Table ${tableNum}. ${ctx.ariaLabel}` : ctx.ariaLabel

  return (
    <div
      className="@container pointer-events-none absolute inset-0 z-[125] flex flex-col overflow-hidden rounded-[inherit] bg-gradient-to-b from-black/72 via-black/78 to-black/85 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]"
      role="group"
      aria-label={ariaLabel}
    >
      {ctx.variant === 'side' ? <SidePotRibbon tableNum={tableNum} /> : null}
      {ctx.variant === 'winner' ? <WinnerTitleStrip tableNum={tableNum} /> : null}
      {ctx.variant === 'split' ? <SplitPotRibbon tableNum={tableNum} /> : null}
      <div className="flex min-h-0 flex-1 flex-col pb-2 pt-0">
        <ShowdownCardBody ctx={ctx} allWinners={allWinners} />
      </div>
    </div>
  )
}
