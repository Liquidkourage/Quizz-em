import {
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import { resolveShowdownSidePotLines, ShowdownTableBadge, type ShowdownSidePotLine } from './venueFloorSidePotDisplay'
import { ShowdownWinnerCompPanel } from './ShowdownWinnerCompPanel'
import { BroadcastShowdownPanel } from './BroadcastShowdownPanel'
import {
  isShowdownDenseLayout,
  showdownDenseOverlayStyle,
} from './showdownStageDenseRubric'

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

export function VenueFloorShowdownByVariant({
  tableNum,
  pot,
  rows,
  correctAnswer,
  layoutTableCount,
  stageViewport = 'mosaic',
  labMode: _labMode,
}: {
  tableNum?: number
  pot: number
  rows: ShowdownResultRow[]
  correctAnswer: number | undefined
  layoutTableCount: number
  stageViewport?: 'mosaic' | 'broadcast'
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

  const compWinners = ctx.variant === 'split' ? allWinners : ctx.winners
  const denseLayout = isShowdownDenseLayout(layoutTableCount)

  const ariaLabel =
    tableNum != null ? `Table ${tableNum}. ${ctx.ariaLabel}` : ctx.ariaLabel

  if (stageViewport === 'broadcast') {
    return (
      <div
        className="vfd-showdown-winner-comp pointer-events-none absolute inset-0 z-[135] overflow-hidden rounded-[inherit]"
        role="group"
        aria-label={ariaLabel}
        data-stage-viewport="broadcast"
      >
        <BroadcastShowdownPanel
          variant={ctx.variant}
          winners={compWinners}
          chipRow={ctx.chipRow}
          pot={ctx.pot}
          correctAnswer={correctAnswer}
          sidePotLines={ctx.sidePotLines}
          label={ctx.label}
        />
      </div>
    )
  }

  return (
    <div
      className="@container vfd-showdown-winner-comp pointer-events-none absolute inset-0 z-[135] overflow-hidden rounded-[inherit]"
      role="group"
      aria-label={ariaLabel}
      data-showdown-dense={denseLayout ? '' : undefined}
      data-stage-viewport={stageViewport}
      style={denseLayout ? showdownDenseOverlayStyle() : undefined}
    >
      {tableNum != null ? (
        <span className="absolute left-1 top-1 z-20">
          <ShowdownTableBadge tableNum={tableNum} />
        </span>
      ) : null}
      <ShowdownWinnerCompPanel
        variant={ctx.variant}
        winners={compWinners}
        chipRow={ctx.chipRow}
        pot={ctx.pot}
        correctAnswer={correctAnswer}
        sidePotLines={ctx.sidePotLines}
        layoutTableCount={layoutTableCount}
      />
    </div>
  )
}
