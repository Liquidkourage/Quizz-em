import type { ReactNode } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import {
  cardsUsedFromComposition,
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'

export type VenueFloorShowdownVariantId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20

export const VENUE_FLOOR_SHOWDOWN_VARIANT_COUNT = 20

export const VENUE_FLOOR_SHOWDOWN_VARIANT_NAMES: Record<VenueFloorShowdownVariantId, string> = {
  1: 'Classic pills stack',
  2: 'Giant guess hero',
  3: 'Banner + ghost guess',
  4: 'Gold banner trio',
  5: 'Right scoreboard',
  6: 'Crown chips only',
  7: 'Crown + pill row',
  8: 'Inset winner card',
  9: 'Split or crown',
  10: 'Inset with pills',
  11: 'Chips · pills · guess',
  12: 'Split · pills · chips',
  13: 'Split pot stack',
  14: 'Marquee + pills',
  15: 'Guess over pills',
  16: 'Digits + banner',
  17: 'Left scoreboard',
  18: 'Crown · stagger list',
  19: 'Sash + inset zone',
  20: 'Noir crown strip',
}

export function venueFloorShowdownVariantForTable(tableNum: number): VenueFloorShowdownVariantId {
  const n = ((Math.floor(tableNum) - 1) % VENUE_FLOOR_SHOWDOWN_VARIANT_COUNT) + 1
  return n as VenueFloorShowdownVariantId
}

type FloorShowdownCtx = {
  variantId: VenueFloorShowdownVariantId
  tableNum: number
  labMode: boolean
  label: string
  winners: ShowdownResultRow[]
  chipRow: ShowdownResultRow | null
  guess: string | null
  namePills: ShowdownResultRow[]
  extraWinners: number
  ariaLabel: string
}

function buildCtx(
  variantId: VenueFloorShowdownVariantId,
  tableNum: number,
  labMode: boolean,
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
  const namePills = winners.slice(0, 4)
  const extraWinners = winners.length - namePills.length
  const guess =
    chipRow?.submitted != null && typeof correctAnswer === 'number'
      ? formatTriviaNumber(chipRow.submitted)
      : null

  return {
    variantId,
    tableNum,
    labMode,
    label,
    winners,
    chipRow,
    guess,
    namePills,
    extraWinners,
    ariaLabel: `${label}: ${winners.map((w) => w.name).join(', ')}`,
  }
}

/** Lab / preview rows when tiles are not in live showdown. */
export function synthesizeLabShowdownRows(tile: DisplayVenueTileSnapshot): {
  rows: ShowdownResultRow[]
  correctAnswer: number
} {
  const board = [4, 0, 2, 5, 6] as const
  const correctAnswer = 40
  const names = (tile.seatNames ?? []).map((n) => (typeof n === 'string' ? n.trim() : ''))
  const seated = names.filter((n) => n.length > 0)
  /** Lab: tables 11–20 preview split-pot UI (two tied winners). */
  const splitDemo = tile.tableNum >= 11 && tile.tableNum <= 20
  const rosterLen = Math.max(seated.length, splitDemo ? 2 : 1)
  const winnerSeats = splitDemo ? [0, 1] : [0]
  const winningSubmitted = 40 + (tile.tableNum % 7) * 0.001

  const rows: ShowdownResultRow[] = []
  for (let i = 0; i < rosterLen; i++) {
    const name =
      seated[i] ??
      (splitDemo && i === 1
        ? `Split · Table ${tile.tableNum}`
        : `Table ${tile.tableNum} · Seat ${i + 1}`)
    if (!name) continue
    const holes: [number, number] = [(i + 2) % 10, (i + 4) % 10]
    const submitted = winnerSeats.includes(i) ? winningSubmitted : winningSubmitted + 3.5 + i * 0.1
    const composition = [
      { source: 'community' as const, index: 0 },
      { source: 'community' as const, index: 1 },
      { source: 'hole' as const, index: 0 },
      { source: 'community' as const, index: 2 },
      { source: 'community' as const, index: 3 },
    ]
    rows.push({
      seat: i + 1,
      name,
      holes,
      submitted: winnerSeats.includes(i) ? submitted : submitted + 3.5,
      hasFolded: false,
      communityBoard: [...board],
      answerCommunityIndices: [0, 1, 2, 3],
      answerCards: cardsUsedFromComposition(composition, holes, board),
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

function VariantBadge({ ctx }: { ctx: FloorShowdownCtx }) {
  if (!ctx.labMode) return null
  return (
    <span
      className="absolute left-1 top-1 z-[130] rounded border border-white/25 bg-black/80 px-1 py-px font-mono text-[0.4rem] font-bold tabular-nums leading-none text-white/70"
      title={VENUE_FLOOR_SHOWDOWN_VARIANT_NAMES[ctx.variantId]}
    >
      #{String(ctx.variantId).padStart(2, '0')}
    </span>
  )
}

function FloorChips({
  chipRow,
  className = '',
  size = 'floor' as const,
}: {
  chipRow: ShowdownResultRow | null
  className?: string
  size?: 'floor' | 'sm' | 'xs' | 'md'
}) {
  if (chipRow == null) return null
  return (
    <div
      className={`@container flex min-h-0 min-w-0 items-center justify-center ${className}`}
      style={{ containerType: 'size' }}
    >
      <ShowdownFiveCardsUsed row={chipRow} size={size} />
    </div>
  )
}

function WinnerStarPill({ w }: { w: ShowdownResultRow }) {
  return (
    <span
      className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-full border-2 border-amber-400/85 bg-amber-950/92 py-0.5 pl-1 pr-1.5 shadow-[0_0_10px_rgba(251,191,36,0.35)]"
      title={`Seat ${w.seat}`}
    >
      <span className="flex h-[0.85em] w-[0.85em] shrink-0 items-center justify-center rounded-full bg-amber-400/90 text-[0.45rem] font-black text-amber-950">
        ★
      </span>
      <span className="min-w-0 truncate text-[0.5rem] font-black text-amber-50">{w.name}</span>
    </span>
  )
}

function ExtraWinnersChip({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="rounded-full border border-amber-500/40 bg-black/55 px-1.5 py-0.5 text-[0.45rem] font-semibold text-amber-200/75">
      +{n}
    </span>
  )
}

function WinnerPillsRow({ ctx }: { ctx: FloorShowdownCtx }) {
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
      {ctx.namePills.map((w) => (
        <WinnerStarPill key={`${w.seat}:${w.name}`} w={w} />
      ))}
      <ExtraWinnersChip n={ctx.extraWinners} />
    </div>
  )
}

function GoldTopBanner({ ctx }: { ctx: FloorShowdownCtx }) {
  return (
    <div className="shrink-0 border-b-2 border-amber-400/70 bg-gradient-to-r from-amber-900/95 via-yellow-700/90 to-amber-900/95 px-[4%] py-1 shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
      <p className="text-center text-[0.38rem] font-bold uppercase tracking-[0.28em] text-amber-950/80">
        {ctx.label}
      </p>
      <WinnerPillsRow ctx={ctx} />
    </div>
  )
}

function CrownBar({ ctx, compact }: { ctx: FloorShowdownCtx; compact?: boolean }) {
  return (
    <div
      className={`shrink-0 bg-gradient-to-r from-amber-600/90 via-yellow-500/85 to-amber-600/90 text-center shadow-md ${
        compact ? 'px-[3%] py-0.5' : 'px-[4%] py-1'
      }`}
    >
      <p className="text-[0.42rem] font-black uppercase tracking-[0.22em] text-amber-950">👑 {ctx.label}</p>
      {!compact ? (
        <p className="truncate text-[0.52rem] font-black text-amber-950">
          {ctx.winners.map((w) => w.name).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

function SplitPotBanner() {
  return (
    <div className="shrink-0 bg-gradient-to-r from-rose-700/95 via-amber-600/95 to-rose-700/95 py-0.5 text-center">
      <p className="text-[0.48rem] font-black uppercase tracking-[0.28em] text-white">Split pot</p>
    </div>
  )
}

function SplitOrLabelBanner({ ctx }: { ctx: FloorShowdownCtx }) {
  return ctx.winners.length > 1 ? <SplitPotBanner /> : <CrownBar ctx={ctx} compact />
}

function ScoreboardRail(ctx: FloorShowdownCtx, side: 'left' | 'right') {
  const border = side === 'left' ? 'border-r-2' : 'border-l-2'
  return (
    <div
      className={`flex w-[30%] shrink-0 flex-col ${border} border-amber-500/45 bg-gradient-to-b from-black/92 via-amber-950/75 to-black/95`}
    >
      <p className="shrink-0 border-b border-amber-500/35 bg-amber-600/35 py-0.5 text-center text-[0.38rem] font-black uppercase tracking-widest text-amber-100">
        {ctx.label}
      </p>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 px-1 py-1">
        {ctx.namePills.map((w) => (
          <div
            key={`${w.seat}:${w.name}`}
            className="rounded border border-amber-400/40 bg-black/50 px-1 py-0.5"
          >
            <p className="font-mono text-[0.38rem] font-bold tabular-nums text-amber-300/75">S{w.seat}</p>
            <p className="truncate text-[0.44rem] font-black leading-tight text-amber-50">{w.name}</p>
          </div>
        ))}
        <ExtraWinnersChip n={ctx.extraWinners} />
      </div>
      {ctx.guess ? (
        <p className="shrink-0 border-t border-amber-500/30 py-1 text-center font-mono text-[0.52rem] font-black tabular-nums text-yellow-300">
          {ctx.guess}
        </p>
      ) : null}
    </div>
  )
}

function InsetFeltCard({
  ctx,
  children,
  pad = '8%',
}: {
  ctx: FloorShowdownCtx
  children: ReactNode
  pad?: string
}) {
  return (
    <div className="flex h-full items-center justify-center" style={{ padding: pad }}>
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border-2 border-amber-400/70 bg-black/88 shadow-[0_8px_28px_rgba(0,0,0,0.65)]">
        <p className="shrink-0 border-b border-amber-500/30 py-1 text-center text-[0.42rem] font-bold uppercase text-amber-200/80">
          {ctx.label}
        </p>
        {children}
      </div>
    </div>
  )
}

function GiantGuessText({
  ctx,
  tone = 'hero',
}: {
  ctx: FloorShowdownCtx
  tone?: 'hero' | 'ghost'
}) {
  if (!ctx.guess) return null
  if (tone === 'ghost') {
    return (
      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-[6%] top-[22%] text-center font-mono text-[clamp(1rem,28cqw,1.6rem)] font-black tabular-nums leading-none text-amber-500/12"
      >
        {ctx.guess}
      </p>
    )
  }
  return (
    <p className="font-mono text-[clamp(0.85rem,24cqw,1.35rem)] font-black tabular-nums leading-none text-amber-50">
      {ctx.guess}
    </p>
  )
}

function MarqueeBulbs() {
  return (
    <div className="flex shrink-0 justify-center gap-[0.35rem] px-[8%] pt-[3%]">
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className="h-[0.45rem] w-[0.45rem] rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)] motion-safe:animate-[venue-bulb_1.4s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.12}s` }}
          aria-hidden
        />
      ))}
    </div>
  )
}

function StaggerWinners({ ctx }: { ctx: FloorShowdownCtx }) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5 px-[7%] pb-[4%]">
      {ctx.namePills.map((w, i) => (
        <div
          key={`${w.seat}:${w.name}`}
          className="flex min-w-0 items-center gap-1 motion-safe:animate-[venue-stagger-in_0.5s_ease-out_both]"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <span
            className="h-[0.35rem] w-[0.35rem] shrink-0 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate rounded-r bg-amber-500/25 py-px pl-1 text-[0.46rem] font-bold text-amber-50">
            {w.name}
          </span>
        </div>
      ))}
      <ExtraWinnersChip n={ctx.extraWinners} />
    </div>
  )
}

function DigitColumn(chipRow: ShowdownResultRow | null) {
  const digits = chipRow?.answerCards.map((c) => c.digit) ?? []
  if (digits.length === 0) return null
  return (
    <div className="flex w-[26%] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-amber-500/25 bg-black/55 py-2">
      {digits.map((d, i) => (
        <span
          key={i}
          className="flex h-[0.95rem] w-[0.95rem] items-center justify-center rounded border border-emerald-400/60 bg-emerald-950/90 font-mono text-[0.55rem] font-black text-emerald-100"
        >
          {d}
        </span>
      ))}
    </div>
  )
}

function DiagonalWinnerSash({ ctx }: { ctx: FloorShowdownCtx }) {
  return (
    <div
      className="pointer-events-none absolute -left-[16%] top-[6%] z-[126] w-[76%] -rotate-[36deg] border-y-2 border-amber-300/80 bg-gradient-to-r from-amber-500/95 via-yellow-400/90 to-amber-500/95 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
      aria-hidden
    >
      <p className="truncate px-2 text-center text-[0.44rem] font-black uppercase tracking-wide text-amber-950">
        ★ {ctx.winners.map((w) => w.name).join(' · ')}
        {ctx.extraWinners > 0 ? ` +${ctx.extraWinners}` : ''}
      </p>
    </div>
  )
}

function ChipsFooterNames({ ctx }: { ctx: FloorShowdownCtx }) {
  return (
    <p className="shrink-0 truncate px-[6%] pb-[4%] text-center text-[0.48rem] font-bold text-amber-100/90">
      {ctx.winners.map((w) => w.name).join(' · ')}
    </p>
  )
}

function renderVariant(ctx: FloorShowdownCtx): ReactNode {
  switch (ctx.variantId) {
    case 1:
      return (
        <>
          <div className="flex shrink-0 flex-col items-center gap-1 px-[5%] pb-1 pt-[4%] text-center">
            <p className="text-[0.45rem] font-bold uppercase tracking-[0.2em] text-amber-200/75">{ctx.label}</p>
            <WinnerPillsRow ctx={ctx} />
            {ctx.guess ? (
              <p className="font-mono text-[0.5rem] font-bold tabular-nums text-amber-100/90">{ctx.guess}</p>
            ) : null}
          </div>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[4%] pb-[5%]" />
        </>
      )
    case 2:
      return (
        <>
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-[5%]">
            <GiantGuessText ctx={ctx} />
            <p className="text-[0.45rem] font-bold uppercase tracking-widest text-amber-300/70">{ctx.label}</p>
          </div>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[3%] pb-[3%]" />
          <WinnerPillsRow ctx={ctx} />
          <ChipsFooterNames ctx={ctx} />
        </>
      )
    case 3:
      return (
        <div className="relative flex h-full min-h-0 w-full flex-col">
          <GoldTopBanner ctx={ctx} />
          <GiantGuessText ctx={ctx} tone="ghost" />
          <FloorChips chipRow={ctx.chipRow} className="relative z-[1] w-full flex-1 px-[4%] pb-[4%]" />
        </div>
      )
    case 4:
      return (
        <>
          <GoldTopBanner ctx={ctx} />
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[4%]" />
          {ctx.guess ? (
            <p className="shrink-0 pb-[4%] text-center font-mono text-[0.52rem] font-bold tabular-nums text-amber-200/80">
              {ctx.guess}
            </p>
          ) : null}
        </>
      )
    case 5:
      return (
        <div className="flex h-full min-h-0 w-full">
          <FloorChips chipRow={ctx.chipRow} className="min-w-0 flex-[1.35] px-[3%] py-[4%]" />
          {ScoreboardRail(ctx, 'right')}
        </div>
      )
    case 6:
      return (
        <>
          <CrownBar ctx={ctx} />
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%] pb-[5%]" />
        </>
      )
    case 7:
      return (
        <>
          <CrownBar ctx={ctx} />
          <div className="flex shrink-0 justify-center py-1">
            <WinnerPillsRow ctx={ctx} />
          </div>
          {ctx.guess ? (
            <p className="shrink-0 text-center font-mono text-[0.48rem] font-bold tabular-nums text-amber-100/85">
              {ctx.guess}
            </p>
          ) : null}
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%] pb-[4%]" />
        </>
      )
    case 8:
      return (
        <InsetFeltCard ctx={ctx}>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[6%]" />
          <div className="shrink-0 space-y-0.5 border-t border-amber-500/25 px-[4%] py-1">
            <WinnerPillsRow ctx={ctx} />
          </div>
        </InsetFeltCard>
      )
    case 9:
      return (
        <>
          <SplitOrLabelBanner ctx={ctx} />
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%]" />
          <div className="shrink-0 px-[5%] pb-[4%] text-center">
            <WinnerPillsRow ctx={ctx} />
          </div>
        </>
      )
    case 10:
      return (
        <InsetFeltCard ctx={ctx} pad="6%">
          <div className="shrink-0 flex justify-center py-1">
            <WinnerPillsRow ctx={ctx} />
          </div>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%]" />
          {ctx.guess ? (
            <p className="shrink-0 border-t border-amber-500/25 py-1 text-center font-mono text-[0.46rem] font-bold tabular-nums text-amber-200/85">
              {ctx.guess}
            </p>
          ) : null}
        </InsetFeltCard>
      )
    case 11:
      return (
        <>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-[1.15] px-[3%] pt-[4%]" />
          <div className="flex shrink-0 flex-col items-center gap-1 px-[5%] pb-[5%] text-center">
            <p className="text-[0.42rem] font-bold uppercase text-amber-300/70">{ctx.label}</p>
            <WinnerPillsRow ctx={ctx} />
            {ctx.guess ? (
              <p className="font-mono text-[0.46rem] font-bold tabular-nums text-amber-200/85">{ctx.guess}</p>
            ) : null}
          </div>
        </>
      )
    case 12:
      return (
        <>
          <SplitOrLabelBanner ctx={ctx} />
          <div className="flex shrink-0 justify-center py-1">
            <WinnerPillsRow ctx={ctx} />
          </div>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[4%] pb-[5%]" />
        </>
      )
    case 13:
      return (
        <>
          {ctx.winners.length > 1 ? <SplitPotBanner /> : <CrownBar ctx={ctx} compact />}
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%]" />
          <div className="shrink-0 space-y-0.5 px-[5%] pb-[4%] text-center">
            {ctx.namePills.map((w) => (
              <p key={`${w.seat}:${w.name}`} className="truncate text-[0.48rem] font-bold text-amber-50">
                ★ {w.name}
              </p>
            ))}
            <ExtraWinnersChip n={ctx.extraWinners} />
          </div>
        </>
      )
    case 14:
      return (
        <>
          <MarqueeBulbs />
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%]" />
          <div className="shrink-0 border-t border-amber-500/25 bg-black/55 px-[5%] py-1 text-center">
            <p className="text-[0.4rem] font-bold uppercase tracking-wider text-amber-200/70">{ctx.label}</p>
            <WinnerPillsRow ctx={ctx} />
          </div>
        </>
      )
    case 15:
      return (
        <>
          <div className="flex shrink-0 flex-col items-center gap-1 pt-[5%]">
            <GiantGuessText ctx={ctx} />
            <p className="text-[0.42rem] font-bold uppercase text-amber-300/70">{ctx.label}</p>
          </div>
          <div className="flex shrink-0 justify-center py-1">
            <WinnerPillsRow ctx={ctx} />
          </div>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[4%] pb-[5%]" />
        </>
      )
    case 16:
      return (
        <div className="flex h-full min-h-0 w-full">
          {DigitColumn(ctx.chipRow)}
          <div className="flex min-w-0 flex-1 flex-col">
            <GoldTopBanner ctx={ctx} />
            <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%] pb-[4%]" />
          </div>
        </div>
      )
    case 17:
      return (
        <div className="flex h-full min-h-0 w-full">
          {ScoreboardRail(ctx, 'left')}
          <FloorChips chipRow={ctx.chipRow} className="min-w-0 flex-1 px-[3%] py-[4%]" />
        </div>
      )
    case 18:
      return (
        <>
          <CrownBar ctx={ctx} compact />
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[4%]" />
          <StaggerWinners ctx={ctx} />
        </>
      )
    case 19:
      return (
        <div className="relative h-full w-full overflow-hidden">
          <DiagonalWinnerSash ctx={ctx} />
          <InsetFeltCard ctx={ctx} pad="10%">
            {ctx.guess ? (
              <p className="shrink-0 text-center font-mono text-[0.48rem] font-bold tabular-nums text-amber-200/85">
                {ctx.guess}
              </p>
            ) : null}
            <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%] pb-[4%]" />
          </InsetFeltCard>
        </div>
      )
    case 20:
      return (
        <div className="flex h-full flex-col">
          <CrownBar ctx={ctx} compact />
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%]" size="sm" />
          <div className="mx-[6%] mb-[5%] shrink-0 border-t-2 border-white/90 pt-1">
            <WinnerPillsRow ctx={ctx} />
          </div>
        </div>
      )
    default:
      return null
  }
}

const VARIANT_SHELL: Record<VenueFloorShowdownVariantId, string> = {
  1: 'bg-black/78 backdrop-blur-[1px]',
  2: 'bg-black/82',
  3: 'bg-black/65',
  4: 'bg-black/72',
  5: 'bg-black/78',
  6: 'bg-black/70',
  7: 'bg-black/72',
  8: 'bg-black/55',
  9: 'bg-black/76',
  10: 'bg-black/55',
  11: 'bg-black/76',
  12: 'bg-black/74',
  13: 'bg-black/78',
  14: 'bg-[#120a04]/88',
  15: 'bg-black/80',
  16: 'bg-black/82',
  17: 'bg-black/78',
  18: 'bg-black/76',
  19: 'bg-black/60',
  20: 'bg-black/92',
}

export function VenueFloorShowdownByVariant({
  tableNum,
  rows,
  correctAnswer,
  labMode = false,
}: {
  tableNum: number
  rows: ShowdownResultRow[]
  correctAnswer: number | undefined
  labMode?: boolean
}) {
  const variantId = venueFloorShowdownVariantForTable(tableNum)
  const ctx = buildCtx(variantId, tableNum, labMode, rows, correctAnswer)
  if (ctx == null) return null

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[125] flex flex-col overflow-hidden rounded-[inherit] ${VARIANT_SHELL[variantId]}`}
      role="group"
      aria-label={ctx.ariaLabel}
    >
      <VariantBadge ctx={ctx} />
      {renderVariant(ctx)}
    </div>
  )
}

/** Shared keyframes for animated floor showdown variants. */
export function VenueFloorShowdownVariantStyles() {
  return (
    <style>{`
      @keyframes venue-bulb {
        0%, 100% { opacity: 0.45; transform: scale(0.85); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      @keyframes venue-stagger-in {
        0% { opacity: 0; transform: translateX(-8%); }
        100% { opacity: 1; transform: translateX(0); }
      }
    `}</style>
  )
}
