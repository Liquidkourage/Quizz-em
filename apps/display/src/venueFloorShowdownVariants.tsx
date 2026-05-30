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
  3: 'Chips only',
  4: 'Left name rail',
  5: 'Bottom dock',
  6: 'Neon frame',
  7: 'Crown bar',
  8: 'Initials row',
  9: 'Terminal green',
  10: 'Inset card',
  11: 'Chips over names',
  12: 'Seat badges',
  13: 'Split banner',
  14: 'Spotlight vignette',
  15: 'Minimal number',
  16: 'Vertical digits',
  17: 'Double frame',
  18: 'Name ticker',
  19: 'Corner plaque',
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
      return <FloorChips chipRow={ctx.chipRow} className="h-full w-full p-[6%]" />
    case 4:
      return (
        <div className="flex h-full min-h-0 w-full">
          <div className="flex w-[34%] shrink-0 flex-col justify-center gap-1 border-r border-amber-500/35 bg-black/55 px-1 py-2">
            <p className="text-[0.4rem] font-bold uppercase tracking-wider text-amber-300/65">{ctx.label}</p>
            {ctx.namePills.map((w) => (
              <p key={`${w.seat}:${w.name}`} className="truncate text-[0.48rem] font-black text-amber-50">
                ★ {w.name}
              </p>
            ))}
          </div>
          <FloorChips chipRow={ctx.chipRow} className="min-w-0 flex-1 px-[3%]" />
        </div>
      )
    case 5:
      return (
        <>
          <FloorChips chipRow={ctx.chipRow} className="w-full flex-1 px-[4%] pt-[5%]" />
          <div className="shrink-0 border-t border-amber-500/40 bg-black/90 px-[5%] py-1.5 text-center">
            <p className="text-[0.42rem] font-bold uppercase tracking-wider text-amber-300/75">{ctx.label}</p>
            <p className="truncate text-[0.52rem] font-black text-amber-50">
              {ctx.winners.map((w) => w.name).join(' + ')}
            </p>
            {ctx.guess ? (
              <p className="font-mono text-[0.48rem] font-bold tabular-nums text-emerald-200/90">{ctx.guess}</p>
            ) : null}
          </div>
        </>
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
        <div className="flex h-full flex-col bg-[#041408]/95 px-[5%] py-[4%] font-mono">
          <p className="shrink-0 text-[0.42rem] uppercase tracking-widest text-emerald-400/80">&gt; SHOWDOWN</p>
          <p className="shrink-0 truncate text-[0.48rem] text-emerald-200/90">
            WIN: {ctx.winners.map((w) => w.name).join(', ')}
          </p>
          {ctx.guess ? <p className="shrink-0 text-[0.55rem] font-bold tabular-nums text-emerald-300">{ctx.guess}</p> : null}
          <FloorChips chipRow={ctx.chipRow} className="flex-1" size="sm" />
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
    case 12:
      return (
        <>
          <div className="flex shrink-0 flex-wrap justify-center gap-1 pt-[5%]">
            {ctx.namePills.map((w) => (
              <span
                key={`${w.seat}:${w.name}`}
                className="rounded-md border border-yellow-400/80 bg-yellow-950/80 px-1.5 py-0.5 font-mono text-[0.48rem] font-black tabular-nums text-yellow-100"
                title={w.name}
              >
                S{w.seat}
              </span>
            ))}
          </div>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%]" />
          <p className="shrink-0 truncate px-[6%] pb-[4%] text-center text-[0.45rem] text-white/75">
            {ctx.winners.map((w) => w.name).join(' · ')}
          </p>
        </>
      )
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
        <div
          className="flex h-full flex-col"
          style={{
            background:
              'radial-gradient(ellipse 85% 75% at 50% 45%, rgba(251,191,36,0.14) 0%, rgba(0,0,0,0.88) 68%, rgba(0,0,0,0.96) 100%)',
          }}
        >
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%] pt-[8%]" />
          <p className="shrink-0 pb-[6%] text-center text-[0.48rem] font-black text-amber-50">
            {ctx.winners.map((w) => w.name).join(' · ')}
          </p>
        </div>
      )
    case 15:
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 px-[6%]">
          {ctx.guess ? (
            <p className="font-mono text-[clamp(0.75rem,22cqw,1.2rem)] font-black tabular-nums leading-none text-white">
              {ctx.guess}
            </p>
          ) : null}
          <p className="text-[0.42rem] font-bold uppercase tracking-wider text-amber-400/80">{ctx.label}</p>
          <p className="max-w-full truncate text-[0.48rem] font-semibold text-amber-100/90">
            ★ {ctx.winners.map((w) => w.name).join(' · ')}
          </p>
          <FloorChips chipRow={ctx.chipRow} className="h-[38%] w-full" size="xs" />
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
        <div className="flex h-full flex-col p-[6%]">
          <div className="flex h-full flex-col rounded-md border-2 border-amber-400/80 p-[3px] shadow-[0_0_16px_rgba(251,191,36,0.25)]">
            <div className="flex h-full flex-col rounded-sm border border-amber-500/50 bg-black/85">
              <p className="shrink-0 pt-[5%] text-center text-[0.42rem] font-bold uppercase text-amber-200/75">
                {ctx.label}
              </p>
              <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%]" />
              <p className="shrink-0 truncate pb-[5%] text-center text-[0.46rem] font-bold text-amber-50">
                {ctx.winners.map((w) => w.name).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      )
    case 18:
      return (
        <>
          <div className="shrink-0 overflow-hidden border-b border-amber-500/35 bg-amber-950/50 py-0.5">
            <p className="whitespace-nowrap text-[0.48rem] font-bold uppercase tracking-wide text-amber-100 motion-safe:animate-[venue-ticker_14s_linear_infinite]">
              {ctx.winners.map((w) => `★ ${w.name}`).join('   ·   ')}   ·   {ctx.guess ?? ''}
            </p>
          </div>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[4%] pb-[4%]" />
        </>
      )
    case 19:
      return (
        <>
          <FloorChips chipRow={ctx.chipRow} className="flex-1 px-[5%] pt-[6%]" />
          <div className="absolute bottom-[6%] right-[5%] z-[128] max-w-[72%] rounded-md border border-amber-400/65 bg-black/92 px-1.5 py-1 shadow-lg">
            <p className="text-[0.38rem] font-bold uppercase tracking-wider text-amber-400/80">{ctx.label}</p>
            <p className="truncate text-[0.46rem] font-black text-amber-50">{ctx.winners.map((w) => w.name).join(' · ')}</p>
          </div>
        </>
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
  3: 'bg-black/70',
  4: 'bg-black/75',
  5: 'bg-black/80',
  6: 'bg-transparent',
  7: 'bg-black/72',
  8: 'bg-black/78',
  9: 'bg-transparent',
  10: 'bg-black/55',
  11: 'bg-black/76',
  12: 'bg-black/80',
  13: 'bg-black/78',
  14: 'bg-black/60',
  15: 'bg-black/85',
  16: 'bg-black/82',
  17: 'bg-black/70',
  18: 'bg-black/80',
  19: 'bg-black/65',
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

/** Inject ticker keyframes once (variant 18). */
export function VenueFloorShowdownVariantStyles() {
  return (
    <style>{`
      @keyframes venue-ticker {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `}</style>
  )
}
