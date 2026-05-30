import type { ReactNode } from 'react'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import {
  cardsUsedFromComposition,
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import {
  isSidePotLabTable,
  resolveShowdownSidePotLines,
  sidePotLabStyleForTable,
  SidePotLabBadge,
  SidePotRibbon,
  ShowdownPotWinnerList,
  synthesizeSidePotLabRows,
  type ShowdownSidePotLine,
  type SidePotLabStyleId,
} from './venueFloorSidePotLab'

export type VenueFloorShowdownVariantId = 8

export const VENUE_FLOOR_SHOWDOWN_VARIANT_COUNT = 1

export const VENUE_FLOOR_SHOWDOWN_VARIANT_NAMES: Record<VenueFloorShowdownVariantId, string> = {
  8: 'Floor stack',
}

export function venueFloorShowdownVariantForTable(_tableNum: number): VenueFloorShowdownVariantId {
  return 8
}

export type FloorShowdownCtx = {
  variantId: VenueFloorShowdownVariantId
  tableNum: number
  labMode: boolean
  pot: number
  label: string
  winners: ShowdownResultRow[]
  chipRow: ShowdownResultRow | null
  namePills: ShowdownResultRow[]
  extraWinners: number
  splitWin: boolean
  ariaLabel: string
  sidePotLabStyle: SidePotLabStyleId | null
  sidePotLines: ShowdownSidePotLine[] | null
  winnerLine: string | null
}

function formatPot(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
}

function buildCtx(
  variantId: VenueFloorShowdownVariantId,
  tableNum: number,
  labMode: boolean,
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
  const sidePotLabStyle = sidePotLabStyleForTable(tableNum, labMode)
  const sidePotLines = resolveShowdownSidePotLines(rows, correctAnswer, tableNum, labMode)
  const mainLine = sidePotLines?.find((l) => l.label === 'Main')
  const mainRow =
    mainLine != null
      ? rows.find((r) => r.name === mainLine.name && !r.hasFolded) ?? null
      : null
  const displayWinners = mainRow != null ? [mainRow] : winners
  const displayChipRow = pickShowdownFloorChipRow(displayWinners) ?? chipRow
  const displayPot = mainLine?.amount ?? pot
  const displaySplit = sidePotLines == null && winners.length > 1
  const winnerLine = null
  const namePills = displayWinners.slice(0, 4)
  const extraWinners = Math.max(0, winners.length - namePills.length)

  const layerSummary =
    sidePotLines != null
      ? sidePotLines.map((l) => `${l.label} ${formatPot(l.amount)} ${l.name}`).join(', ')
      : null

  return {
    variantId,
    tableNum,
    labMode,
    pot: displayPot,
    label,
    winners: displayWinners,
    chipRow: displayChipRow,
    namePills,
    extraWinners,
    splitWin: displaySplit,
    sidePotLabStyle,
    sidePotLines,
    winnerLine,
    ariaLabel:
      layerSummary != null
        ? `Side pots: ${layerSummary}`
        : displaySplit
          ? `${label}: ${winners.map((w) => w.name).join(', ')}. ${formatPot(displayPot)} each`
          : `${label}: ${winners.map((w) => w.name).join(', ')}. Pot ${formatPot(displayPot)}`,
  }
}

export function synthesizeLabShowdownRows(tile: DisplayVenueTileSnapshot): {
  rows: ShowdownResultRow[]
  correctAnswer: number
} {
  const board = [4, 0, 0, 0, 1] as const
  const winningComposition = [
    { source: 'community' as const, index: 0 },
    { source: 'community' as const, index: 1 },
    { source: 'community' as const, index: 2 },
    { source: 'community' as const, index: 3 },
    { source: 'community' as const, index: 4 },
  ]

  if (isSidePotLabTable(tile.tableNum, true)) {
    return synthesizeSidePotLabRows(tile, winningComposition, board)
  }

  const correctAnswer = 40
  const names = (tile.seatNames ?? []).map((n) => (typeof n === 'string' ? n.trim() : ''))
  const seated = names.filter((n) => n.length > 0)
  const splitDemo = tile.tableNum >= 11 && tile.tableNum <= 20
  const rosterLen = Math.max(seated.length, splitDemo ? 2 : 1)
  const winnerSeats = splitDemo ? [0, 1] : [0]
  /** 40.001 — five board digits with a decimal so lab always shows the dot. */
  const winningSubmitted = 40.001

  const rows: ShowdownResultRow[] = []
  for (let i = 0; i < rosterLen; i++) {
    const name =
      seated[i] ??
      (splitDemo && i === 1
        ? `Split · Table ${tile.tableNum}`
        : `Table ${tile.tableNum} · Seat ${i + 1}`)
    if (!name) continue
    const holes: [number, number] = [(i + 2) % 10, (i + 4) % 10]
    const isWinner = winnerSeats.includes(i)
    rows.push({
      seat: i + 1,
      name,
      holes,
      submitted: isWinner ? winningSubmitted : 43.521,
      hasFolded: false,
      communityBoard: [...board],
      answerCommunityIndices: [0, 1, 2, 3],
      answerCards: cardsUsedFromComposition(
        isWinner
          ? winningComposition
          : [
              { source: 'community' as const, index: 0 },
              { source: 'community' as const, index: 1 },
              { source: 'hole' as const, index: 0 },
              { source: 'community' as const, index: 2 },
              { source: 'community' as const, index: 4 },
            ],
        holes,
        board
      ),
      chipPayout: winnerSeats.includes(i) ? 60 : null,
    })
  }
  return { rows, correctAnswer }
}

export function resolveFloorShowdownData(
  tile: DisplayVenueTileSnapshot,
  liveRows: ShowdownResultRow[],
  liveAnswer: number | undefined,
  labMode: boolean
): { rows: ShowdownResultRow[]; correctAnswer: number | undefined } {
  const hasLive =
    liveRows.length > 0 &&
    liveRows.some((r) => r.submitted != null || r.answerCards.length > 0)
  if (hasLive) return { rows: liveRows, correctAnswer: liveAnswer }
  if (labMode) {
    const synth = synthesizeLabShowdownRows(tile)
    return { rows: synth.rows, correctAnswer: synth.correctAnswer }
  }
  return { rows: [], correctAnswer: undefined }
}

/**
 * Floor showdown type scale (@container on overlay). Visual hierarchy:
 * 1 winner names (largest) → 2 pot amount → 3 five digit cards (winning hand).
 */
const WINNER_NAME =
  'min-w-0 font-black leading-[1.05] text-amber-50 text-[clamp(1rem,12cqw,2.15rem)]'
const POT_AMOUNT =
  'font-mono font-black tabular-nums leading-none text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-[clamp(1.05rem,11cqw,2.4rem)]'

function VariantBadge({ ctx }: { ctx: FloorShowdownCtx }) {
  if (!ctx.labMode) return null
  if (ctx.sidePotLabStyle != null) {
    return <SidePotLabBadge style={ctx.sidePotLabStyle} />
  }
  return (
    <span
      className="absolute right-1 top-1 z-[10] rounded border border-white/25 bg-black/85 px-1 py-px font-mono text-[0.42rem] font-bold tabular-nums text-white/75"
      title={VENUE_FLOOR_SHOWDOWN_VARIANT_NAMES[ctx.variantId]}
    >
      #{String(ctx.variantId).padStart(2, '0')}
    </span>
  )
}

function HeroPot({
  pot,
  splitWin = false,
  subline,
  className = '',
}: {
  pot: number
  splitWin?: boolean
  subline?: string
  className?: string
}) {
  if (pot <= 0 && subline) {
    return null
  }
  return (
    <div className={`text-center ${className}`}>
      {pot > 0 ? (
        <div className="flex items-baseline justify-center gap-[0.35em]">
          <p className={POT_AMOUNT}>{formatPot(pot)}</p>
          {splitWin ? (
            <span className="shrink-0 font-bold uppercase tracking-[0.18em] text-yellow-200/90 text-[clamp(0.48rem,4.5cqw,0.68rem)]">
              each
            </span>
          ) : null}
        </div>
      ) : null}
      {subline ? (
        <p className="mt-0.5 text-[clamp(0.42rem,3.8cqw,0.58rem)] font-medium text-white/55">{subline}</p>
      ) : null}
    </div>
  )
}

function PotChip({ pot, splitWin = false }: { pot: number; splitWin?: boolean }) {
  return (
    <div className="inline-flex flex-col items-center rounded-xl border-2 border-yellow-500/55 bg-gradient-to-b from-yellow-900/90 via-amber-950/92 to-black/90 px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.6)]">
      <HeroPot pot={pot} splitWin={splitWin} />
    </div>
  )
}

function WinnerBlock({ ctx, layout = 'line' }: { ctx: FloorShowdownCtx; layout?: 'pills' | 'line' }) {
  if (ctx.winnerLine != null && ctx.winnerLine.length > 0) {
    return (
      <div className="min-w-0 text-center">
        <p className={`${WINNER_NAME} truncate`}>{ctx.winnerLine}</p>
      </div>
    )
  }
  if (layout === 'line') {
    return (
      <div className="min-w-0 text-center">
        <p className={`${WINNER_NAME} truncate`}>
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
            <span className={`${WINNER_NAME} truncate`}>{w.name}</span>
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
  return <ShowdownFiveCardsUsed row={ctx.chipRow} size="floor" />
}

function FloorPotBlock(ctx: FloorShowdownCtx) {
  if (ctx.sidePotLines != null) {
    return <ShowdownPotWinnerList lines={ctx.sidePotLines} />
  }
  return <HeroPot pot={ctx.pot} splitWin={ctx.splitWin} />
}

type WinnerLayout = 'pills' | 'line'
type PotStyle = 'hero' | 'chip'

/** Canonical order: winner → pot (centered in gap) → five winning digit cards. */
function ShowdownStack({
  ctx,
  winnerLayout = 'line',
  potStyle = 'hero',
  className = '',
}: {
  ctx: FloorShowdownCtx
  winnerLayout?: WinnerLayout
  potStyle?: PotStyle
  className?: string
}) {
  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col items-center ${className}`}>
      <div className="flex w-full min-h-0 flex-1 items-end justify-center pb-2">
        <WinnerBlock ctx={ctx} layout={winnerLayout} />
      </div>
      <div className="w-full shrink-0 py-2.5">
        {potStyle === 'chip' ? (
          <PotChip pot={ctx.pot} splitWin={ctx.splitWin} />
        ) : (
          FloorPotBlock(ctx)
        )}
      </div>
      <div className="flex w-full min-h-0 flex-1 items-start justify-center overflow-hidden pt-2">
        {GuessBlock(ctx)}
      </div>
    </div>
  )
}

function SplitPotRibbon() {
  return (
    <div className="shrink-0 bg-gradient-to-r from-rose-700/95 via-amber-600/95 to-rose-700/95 py-1 text-center">
      <p className="text-[clamp(0.5rem,5cqw,0.7rem)] font-black uppercase tracking-widest text-white">
        Split pot
      </p>
    </div>
  )
}

function renderVariant(ctx: FloorShowdownCtx): ReactNode {
  if (ctx.variantId !== 8) return null
  return (
    <div className="flex min-h-0 flex-1 flex-col px-2.5 py-3">
      <ShowdownStack ctx={ctx} winnerLayout="line" className="min-h-0 flex-1 justify-center" />
    </div>
  )
}

export function VenueFloorShowdownByVariant({
  tableNum,
  pot,
  rows,
  correctAnswer,
  labMode = false,
}: {
  tableNum: number
  pot: number
  rows: ShowdownResultRow[]
  correctAnswer: number | undefined
  labMode?: boolean
}) {
  const variantId = venueFloorShowdownVariantForTable(tableNum)
  const ctx = buildCtx(variantId, tableNum, labMode, pot, rows, correctAnswer)
  if (ctx == null) return null

  return (
    <div
      className="@container pointer-events-none absolute inset-0 z-[125] flex flex-col overflow-hidden rounded-[inherit] bg-gradient-to-b from-black/72 via-black/78 to-black/85 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]"
      role="group"
      aria-label={ctx.ariaLabel}
    >
      <VariantBadge ctx={ctx} />
      {ctx.sidePotLines != null ? <SidePotRibbon /> : null}
      {ctx.splitWin && ctx.sidePotLines == null ? <SplitPotRibbon /> : null}
      {renderVariant(ctx)}
    </div>
  )
}
