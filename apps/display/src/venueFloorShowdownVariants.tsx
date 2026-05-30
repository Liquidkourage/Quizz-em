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
  1: 'Gold pills + chips',
  2: 'Giant guess',
  3: 'Side ribbons + chips',
  4: 'Top winner banner',
  5: 'Right scoreboard',
  6: 'Neon frame',
  7: 'Crown bar',
  8: 'Initials row',
  9: 'Ticket stub',
  10: 'Inset card',
  11: 'Chips over names',
  12: 'Podium seats',
  13: 'Split banner',
  14: 'Marquee lights',
  15: 'LED scoreboard',
  16: 'Vertical digits',
  17: 'Poker card',
  18: 'Stagger winner list',
  19: 'Diagonal sash',
  20: 'Noir strip',
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
  const splitDemo = tile.tableNum === 13 || tile.tableNum === 14 || tile.tableNum === 16
  const winnerSeats = splitDemo
    ? seated.slice(0, 2).map((_, i) => i)
    : [0]
  if (winnerSeats.length === 0) {
    winnerSeats.push(0)
    names[0] = `Table ${tile.tableNum} winner`
  }

  const rows: ShowdownResultRow[] = []
  for (let i = 0; i < Math.max(seated.length, 1); i++) {
    const name = seated[i] ?? names[i] ?? `Seat ${i + 1}`
    if (!name) continue
    const holes: [number, number] = [(i + 2) % 10, (i + 4) % 10]
    const submitted = 40 + (tile.tableNum % 7) * 0.001 + i * 0.111
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
      chipPayout: winnerSeats.includes(i) ? 120 : null,
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
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

function renderVariant(ctx: FloorShowdownCtx): ReactNode {
  switch (ctx.variantId) {
    case 1:
      return (
        <>
          <div className="flex shrink-0 flex-col items-center gap-1 px-[5%] pb-1 pt-[4%] text-center">
            <p className="text-[0.45rem] font-bold uppercase tracking-[0.2em] text-amber-200/75">{ctx.label}</p>
            <div className="flex max-w-full flex-wrap justify-center gap-1">
              {ctx.namePills.map((w) => (
                <WinnerStarPill key={`${w.seat}:${w.name}`} w={w} />
              ))}
              {ctx.extraWinners > 0 ? (
                <span className="rounded-full border border-amber-500/40 px-1.5 py-0.5 text-[0.45rem] text-amber-200/75">
                  +{ctx.extraWinners}
                </span>
              ) : null}
            </div>
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
          <div className="flex shrink-0 flex-col items-center pt-[6%]">
            {ctx.guess ? (
              <p className="font-mono text-[clamp(0.85rem,24cqw,1.35rem)] font-black tabular-nums leading-none text-amber-50">
                {ctx.guess}
              </p>
            ) : null}
            <p className="mt-1 text-[0.45rem] font-bold uppercase tracking-widest text-amber-300/70">{ctx.label}</p>
          </div>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[3%] pb-[4%]" />
          <p className="shrink-0 truncate px-[6%] pb-[5%] text-center text-[0.48rem] font-bold text-amber-100/85">
            {ctx.winners.map((w) => w.name).join(' · ')}
          </p>
        </>
      )
    case 3:
      return (
        <div className="flex h-full min-h-0 w-full items-stretch">
          <div className="flex w-[18%] shrink-0 flex-col items-center justify-center gap-1 border-r border-amber-500/30 bg-gradient-to-b from-amber-950/90 to-black/80 py-2">
            {ctx.namePills[0] ? (
              <span
                className="flex max-h-[42%] min-h-0 w-full flex-col items-center justify-center px-0.5 [writing-mode:vertical-rl] rotate-180"
                title={ctx.namePills[0].name}
              >
                <span className="truncate text-[0.42rem] font-black uppercase tracking-wide text-amber-50">
                  ★ {ctx.namePills[0].name}
                </span>
              </span>
            ) : null}
          </div>
          <FloorChips chipRow={ctx.chipRow} className="min-w-0 flex-1 px-[2%]" />
          <div className="flex w-[18%] shrink-0 flex-col items-center justify-center gap-1 border-l border-amber-500/30 bg-gradient-to-b from-black/80 to-amber-950/90 py-2">
            {ctx.namePills[1] ? (
              <span
                className="flex max-h-[42%] min-h-0 w-full flex-col items-center justify-center px-0.5 [writing-mode:vertical-rl]"
                title={ctx.namePills[1].name}
              >
                <span className="truncate text-[0.42rem] font-black uppercase tracking-wide text-amber-50">
                  {ctx.namePills[1].name} ★
                </span>
              </span>
            ) : ctx.extraWinners > 0 ? (
              <span className="text-[0.4rem] font-bold text-amber-200/70">+{ctx.extraWinners}</span>
            ) : null}
          </div>
        </div>
      )
    case 4:
      return (
        <>
          <div className="shrink-0 border-b-2 border-amber-400/70 bg-gradient-to-r from-amber-900/95 via-yellow-700/90 to-amber-900/95 px-[4%] py-1 shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
            <p className="text-center text-[0.38rem] font-bold uppercase tracking-[0.28em] text-amber-950/80">
              {ctx.label}
            </p>
            <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
              {ctx.namePills.map((w) => (
                <WinnerStarPill key={`${w.seat}:${w.name}`} w={w} />
              ))}
              <ExtraWinnersChip n={ctx.extraWinners} />
            </div>
          </div>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[4%]" />
          {ctx.guess ? (
            <p className="shrink-0 pb-[4%] text-center font-mono text-[0.5rem] font-bold tabular-nums text-amber-200/80">
              {ctx.guess}
            </p>
          ) : null}
        </>
      )
    case 5:
      return (
        <div className="flex h-full min-h-0 w-full">
          <FloorChips chipRow={ctx.chipRow} className="min-w-0 flex-[1.35] px-[3%] py-[4%]" />
          <div className="flex w-[32%] shrink-0 flex-col border-l-2 border-amber-500/45 bg-gradient-to-b from-black/92 via-amber-950/75 to-black/95">
            <p className="shrink-0 border-b border-amber-500/35 bg-amber-600/35 py-0.5 text-center text-[0.38rem] font-black uppercase tracking-widest text-amber-100">
              {ctx.label}
            </p>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 px-1 py-1">
              {ctx.namePills.map((w) => (
                <div
                  key={`${w.seat}:${w.name}`}
                  className="rounded border border-amber-400/40 bg-black/50 px-1 py-0.5"
                >
                  <p className="font-mono text-[0.38rem] font-bold tabular-nums text-amber-300/75">
                    S{w.seat}
                  </p>
                  <p className="truncate text-[0.44rem] font-black leading-tight text-amber-50">{w.name}</p>
                </div>
              ))}
              <ExtraWinnersChip n={ctx.extraWinners} />
            </div>
            {ctx.guess ? (
              <p className="shrink-0 border-t border-amber-500/30 py-1 text-center font-mono text-[0.55rem] font-black tabular-nums text-yellow-300">
                {ctx.guess}
              </p>
            ) : null}
          </div>
        </div>
      )
    case 6:
      return (
        <div className="flex h-full flex-col rounded-[inherit] border-2 border-cyan-400/75 bg-black/45 shadow-[inset_0_0_24px_rgba(34,211,238,0.15)]">
          <p className="shrink-0 pt-[4%] text-center text-[0.42rem] font-bold uppercase tracking-[0.25em] text-cyan-200/80">
            {ctx.label}
          </p>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%]" />
          <p className="shrink-0 pb-[4%] text-center text-[0.48rem] font-bold text-cyan-50/90">
            {ctx.winners[0]?.name}
            {ctx.winners.length > 1 ? ` +${ctx.winners.length - 1}` : ''}
          </p>
        </div>
      )
    case 7:
      return (
        <>
          <div className="shrink-0 bg-gradient-to-r from-amber-600/90 via-yellow-500/85 to-amber-600/90 px-[4%] py-1 text-center shadow-md">
            <p className="text-[0.42rem] font-black uppercase tracking-[0.22em] text-amber-950">👑 {ctx.label}</p>
            <p className="truncate text-[0.52rem] font-black text-amber-950">{ctx.winners.map((w) => w.name).join(' · ')}</p>
          </div>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%] pb-[4%]" />
        </>
      )
    case 8:
      return (
        <>
          <div className="flex shrink-0 justify-center gap-1.5 pt-[5%]">
            {ctx.namePills.map((w) => (
              <span
                key={`${w.seat}:${w.name}`}
                className="flex h-[1.35rem] w-[1.35rem] items-center justify-center rounded-full border-2 border-amber-400 bg-amber-950 text-[0.55rem] font-black text-amber-50 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                title={w.name}
              >
                {initials(w.name)}
              </span>
            ))}
          </div>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%] pb-[5%]" />
          {ctx.guess ? (
            <p className="shrink-0 pb-[4%] text-center font-mono text-[0.48rem] font-bold tabular-nums text-amber-100/85">
              {ctx.guess}
            </p>
          ) : null}
        </>
      )
    case 9:
      return (
        <div className="flex h-full flex-col px-[6%] py-[5%]">
          <div
            className="flex h-full flex-col overflow-hidden rounded-sm border border-dashed border-amber-200/50 bg-gradient-to-b from-amber-100/95 to-amber-50/90 shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 6px,
                rgba(180,120,40,0.12) 6px,
                rgba(180,120,40,0.12) 7px
              )`,
            }}
          >
            <div className="shrink-0 border-b border-dashed border-amber-700/35 bg-amber-200/40 py-0.5">
              <p className="text-center text-[0.38rem] font-black uppercase tracking-[0.35em] text-amber-900/70">
                Admit · showdown
              </p>
            </div>
            <div className="shrink-0 px-2 py-1">
              <p className="text-[0.4rem] font-bold uppercase text-amber-900/65">{ctx.label}</p>
              <p className="truncate text-[0.48rem] font-black text-amber-950">
                {ctx.winners.map((w) => w.name).join(' · ')}
              </p>
              {ctx.guess ? (
                <p className="font-mono text-[0.52rem] font-black tabular-nums text-amber-900">{ctx.guess}</p>
              ) : null}
            </div>
            <FloorChips chipRow={ctx.chipRow} className="min-h-0 flex-1 px-[8%] pb-[6%]" size="sm" />
          </div>
        </div>
      )
    case 10:
      return (
        <div className="flex h-full items-center justify-center p-[8%]">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border-2 border-amber-400/70 bg-black/88 shadow-[0_8px_28px_rgba(0,0,0,0.65)]">
            <p className="shrink-0 border-b border-amber-500/30 py-1 text-center text-[0.42rem] font-bold uppercase text-amber-200/80">
              {ctx.label}
            </p>
            <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[6%]" />
            <p className="shrink-0 truncate border-t border-amber-500/25 py-1 text-center text-[0.48rem] font-bold text-amber-50">
              {ctx.winners.map((w) => w.name).join(' · ')}
            </p>
          </div>
        </div>
      )
    case 11:
      return (
        <>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-[1.15] px-[3%] pt-[4%]" />
          <div className="shrink-0 px-[5%] pb-[5%] text-center">
            <p className="text-[0.42rem] font-bold uppercase text-amber-300/70">{ctx.label}</p>
            <p className="truncate text-[0.5rem] font-black text-white/95">{ctx.winners.map((w) => w.name).join(' · ')}</p>
            {ctx.guess ? (
              <p className="font-mono text-[0.46rem] font-bold tabular-nums text-amber-200/85">{ctx.guess}</p>
            ) : null}
          </div>
        </>
      )
    case 12: {
      const podiumHeights = ['h-[28%]', 'h-[38%]', 'h-[22%]', 'h-[18%]']
      return (
        <>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-[1.2] px-[4%] pt-[4%]" />
          <div className="flex shrink-0 items-end justify-center gap-1 px-[8%] pb-[5%] pt-1">
            {ctx.namePills.map((w, i) => (
              <div
                key={`${w.seat}:${w.name}`}
                className={`flex min-w-0 max-w-[28%] flex-1 flex-col items-center justify-end ${podiumHeights[i] ?? 'h-[20%]'}`}
                title={w.name}
              >
                <p className="mb-0.5 max-w-full truncate text-center text-[0.4rem] font-bold text-amber-100">
                  {w.name.split(/\s+/)[0]}
                </p>
                <div
                  className={`w-full rounded-t border border-amber-400/60 bg-gradient-to-t from-amber-700/90 to-amber-500/75 shadow-[0_-2px_8px_rgba(251,191,36,0.35)] ${
                    i === 0 ? 'min-h-[1.1rem]' : i === 1 ? 'min-h-[0.85rem]' : 'min-h-[0.65rem]'
                  }`}
                >
                  <p className="py-0.5 text-center font-mono text-[0.42rem] font-black text-amber-950">
                    {i + 1}
                  </p>
                </div>
              </div>
            ))}
            <ExtraWinnersChip n={ctx.extraWinners} />
          </div>
        </>
      )
    }
    case 13:
      return (
        <>
          {ctx.winners.length > 1 ? (
            <div className="shrink-0 bg-gradient-to-r from-rose-700/95 via-amber-600/95 to-rose-700/95 py-0.5 text-center">
              <p className="text-[0.48rem] font-black uppercase tracking-[0.28em] text-white">Split pot</p>
            </div>
          ) : (
            <p className="shrink-0 pt-[4%] text-center text-[0.42rem] font-bold uppercase text-amber-300/75">Winner</p>
          )}
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%]" />
          <div className="shrink-0 space-y-0.5 px-[5%] pb-[4%]">
            {ctx.namePills.map((w) => (
              <p key={`${w.seat}:${w.name}`} className="truncate text-center text-[0.48rem] font-bold text-amber-50">
                ★ {w.name}
              </p>
            ))}
          </div>
        </>
      )
    case 14:
      return (
        <>
          <div className="flex shrink-0 justify-center gap-[0.35rem] px-[8%] pt-[4%]">
            {Array.from({ length: 7 }, (_, i) => (
              <span
                key={i}
                className="h-[0.45rem] w-[0.45rem] rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)] motion-safe:animate-[venue-bulb_1.4s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.12}s` }}
                aria-hidden
              />
            ))}
          </div>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%]" />
          <div className="shrink-0 border-t border-amber-500/25 bg-black/55 px-[5%] py-1 text-center">
            <p className="text-[0.4rem] font-bold uppercase tracking-wider text-amber-200/70">{ctx.label}</p>
            <p className="truncate text-[0.48rem] font-black text-amber-50">
              {ctx.winners.map((w) => w.name).join(' · ')}
            </p>
          </div>
        </>
      )
    case 15:
      return (
        <div className="flex h-full flex-col bg-[#0a1628]/95 px-[5%] py-[4%]">
          <p className="shrink-0 text-center text-[0.38rem] font-bold uppercase tracking-[0.2em] text-red-400/90">
            {ctx.label}
          </p>
          {ctx.guess ? (
            <div className="mx-auto my-1 flex shrink-0 gap-0.5 rounded border-2 border-red-900/60 bg-black/80 px-1.5 py-1 shadow-[inset_0_0_12px_rgba(220,38,38,0.25)]">
              {ctx.guess.split('').map((ch, i) => (
                <span
                  key={i}
                  className="flex min-w-[0.55rem] items-center justify-center font-mono text-[0.65rem] font-black tabular-nums text-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
                >
                  {ch}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-0.5">
            {ctx.namePills.map((w) => (
              <p
                key={`${w.seat}:${w.name}`}
                className="truncate text-center text-[0.44rem] font-bold text-cyan-200/85"
              >
                ★ {w.name}
              </p>
            ))}
          </div>
          <FloorChips chipRow={ctx.chipRow} className="h-[36%] w-full shrink-0" size="xs" />
        </div>
      )
    case 16: {
      const digits = ctx.chipRow?.answerCards.map((c) => c.digit) ?? []
      return (
        <div className="flex h-full min-h-0">
          <div className="flex w-[28%] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-white/15 bg-black/50 py-1">
            {digits.map((d, i) => (
              <span
                key={i}
                className="flex h-[0.95rem] w-[0.95rem] items-center justify-center rounded border border-emerald-400/60 bg-emerald-950/90 font-mono text-[0.55rem] font-black text-emerald-100"
              >
                {d}
              </span>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center px-[4%]">
            <p className="text-[0.42rem] font-bold uppercase text-amber-300/75">{ctx.label}</p>
            <p className="truncate text-[0.5rem] font-black text-amber-50">{ctx.winners[0]?.name}</p>
            {ctx.guess ? (
              <p className="font-mono text-[0.48rem] font-bold tabular-nums text-white/90">{ctx.guess}</p>
            ) : null}
          </div>
        </div>
      )
    }
    case 17:
      return (
        <div className="flex h-full items-center justify-center p-[7%]">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/25 bg-gradient-to-br from-[#faf6ee] to-[#e8dcc8] shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
            <span className="absolute left-1 top-1 text-[0.55rem] font-black text-rose-800/80" aria-hidden>
              ★
            </span>
            <span className="absolute right-1 top-1 text-[0.55rem] font-black text-rose-800/80" aria-hidden>
              ★
            </span>
            <span className="absolute bottom-1 left-1 text-[0.55rem] font-black text-rose-800/80" aria-hidden>
              ★
            </span>
            <span className="absolute bottom-1 right-1 text-[0.55rem] font-black text-rose-800/80" aria-hidden>
              ★
            </span>
            <p className="shrink-0 pt-[6%] text-center text-[0.4rem] font-black uppercase tracking-widest text-amber-950/70">
              {ctx.label}
            </p>
            <FloorChips chipRow={ctx.chipRow} className="min-h-0 flex-1 px-[6%]" size="sm" />
            <p className="shrink-0 truncate border-t border-amber-900/15 px-2 py-1 text-center text-[0.44rem] font-bold text-amber-950">
              {ctx.winners.map((w) => w.name).join(' · ')}
            </p>
          </div>
        </div>
      )
    case 18:
      return (
        <>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[4%] pt-[5%]" />
          <div className="flex shrink-0 flex-col gap-0.5 px-[8%] pb-[5%]">
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
        </>
      )
    case 19:
      return (
        <div className="relative h-full w-full overflow-hidden">
          <div
            className="pointer-events-none absolute -left-[18%] top-[8%] z-[126] w-[78%] -rotate-[38deg] border-y-2 border-amber-300/80 bg-gradient-to-r from-amber-500/95 via-yellow-400/90 to-amber-500/95 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            aria-hidden
          >
            <p className="truncate px-2 text-center text-[0.44rem] font-black uppercase tracking-wide text-amber-950">
              ★ {ctx.winners.map((w) => w.name).join(' · ')} {ctx.extraWinners > 0 ? `+${ctx.extraWinners}` : ''}
            </p>
          </div>
          <div className="relative z-[127] flex h-full flex-col pt-[18%]">
            <p className="shrink-0 pr-[8%] text-right text-[0.4rem] font-bold uppercase text-amber-200/75">
              {ctx.label}
            </p>
            {ctx.guess ? (
              <p className="shrink-0 pr-[6%] text-right font-mono text-[0.5rem] font-bold tabular-nums text-amber-100/90">
                {ctx.guess}
              </p>
            ) : null}
            <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%] pb-[5%]" />
          </div>
        </div>
      )
    case 20:
      return (
        <div className="flex h-full flex-col bg-black/92">
          <div className="mx-[6%] mt-[6%] shrink-0 border-b-2 border-white/90 pb-0.5">
            <p className="text-[0.5rem] font-black uppercase tracking-[0.3em] text-white">{ctx.label}</p>
          </div>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%]" size="sm" />
          <p className="shrink-0 px-[6%] pb-[5%] text-center text-[0.46rem] font-bold uppercase tracking-wide text-white/85">
            {ctx.winners.map((w) => w.name).join(' — ')}
          </p>
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
  6: 'bg-transparent',
  7: 'bg-black/72',
  8: 'bg-black/78',
  9: 'bg-black/50',
  10: 'bg-black/55',
  11: 'bg-black/76',
  12: 'bg-black/74',
  13: 'bg-black/78',
  14: 'bg-[#120a04]/88',
  15: 'bg-transparent',
  16: 'bg-black/82',
  17: 'bg-black/55',
  18: 'bg-black/76',
  19: 'bg-black/68',
  20: 'bg-transparent',
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
