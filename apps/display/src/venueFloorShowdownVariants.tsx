import type { ReactNode } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  cardsUsedFromComposition,
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'

export type VenueFloorShowdownVariantId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20

export const VENUE_FLOOR_SHOWDOWN_VARIANT_COUNT = 20

export const VENUE_FLOOR_SHOWDOWN_VARIANT_NAMES: Record<VenueFloorShowdownVariantId, string> = {
  1: 'Top caption · classic number',
  2: 'Bottom pills · hero number',
  3: 'Gold banner · ghost number',
  4: 'Bottom strip · gold number',
  5: 'Right rail · cyan number',
  6: 'Left rail · halo number',
  7: 'Crown top · digit stack',
  8: 'Stagger bottom · wide number',
  9: 'Sash · low number',
  10: 'Top pills · emerald number',
  11: 'Split stars · embossed number',
  12: 'Corner TR · rose number',
  13: 'Corner TL · underline number',
  14: 'Noir bottom · ring number',
  15: 'Marquee · pot-style number',
  16: 'Right names · compact number',
  17: 'Split ribbon · max number',
  18: 'Corner frame · italic number',
  19: 'Bottom text · answer tag',
  20: 'Crown bottom · noir number',
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

/** Readable winner names on mosaic tiles (scales with tile width). */
const WINNER_NAME_TEXT =
  'min-w-0 truncate font-black leading-tight text-amber-50 text-[clamp(0.72rem,8cqw,1.2rem)]'
const WINNER_NAMES_LINE =
  'truncate text-center font-black leading-tight text-amber-50 text-[clamp(0.72rem,8cqw,1.2rem)]'
const WINNER_LABEL_TEXT =
  'font-bold uppercase tracking-[0.14em] text-amber-200/85 text-[clamp(0.44rem,4.5cqw,0.58rem)]'

function WinnerStarPill({ w }: { w: ShowdownResultRow }) {
  return (
    <span
      className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border-2 border-amber-400/85 bg-amber-950/92 py-1 pl-1.5 pr-2 shadow-[0_0_10px_rgba(251,191,36,0.35)]"
      title={`Seat ${w.seat}`}
    >
      <span className="flex h-[1em] w-[1em] shrink-0 items-center justify-center rounded-full bg-amber-400/90 text-[clamp(0.5rem,5cqw,0.7rem)] font-black text-amber-950">
        ★
      </span>
      <span className={WINNER_NAME_TEXT}>{w.name}</span>
    </span>
  )
}

function ExtraWinnersChip({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="rounded-full border border-amber-500/40 bg-black/55 px-2 py-0.5 text-[clamp(0.5rem,5cqw,0.7rem)] font-bold text-amber-200/80">
      +{n}
    </span>
  )
}

function WinnerNamesLine({ ctx, className = '' }: { ctx: FloorShowdownCtx; className?: string }) {
  return (
    <p className={`${WINNER_NAMES_LINE} ${className}`}>
      {ctx.winners.map((w) => w.name).join(' · ')}
      {ctx.extraWinners > 0 ? ` +${ctx.extraWinners}` : ''}
    </p>
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

function DeclShell({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`max-w-full rounded-md border border-amber-400/35 bg-black/48 px-2 py-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.4)] backdrop-blur-[2px] ${className}`}
    >
      {children}
    </div>
  )
}

function DeclLabel({ ctx }: { ctx: FloorShowdownCtx }) {
  return <p className={WINNER_LABEL_TEXT}>{ctx.label}</p>
}

function GoldTopBanner({ ctx }: { ctx: FloorShowdownCtx }) {
  return (
    <div className="border-b border-amber-400/50 bg-gradient-to-r from-amber-900/88 via-yellow-700/82 to-amber-900/88 px-2 py-0.5 shadow-sm">
      <p className="text-center text-[clamp(0.4rem,4cqw,0.52rem)] font-bold uppercase tracking-[0.22em] text-amber-950/85">
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
      <p className="text-[clamp(0.42rem,4.5cqw,0.55rem)] font-black uppercase tracking-[0.22em] text-amber-950">
        👑 {ctx.label}
      </p>
      <p className="truncate font-black text-amber-950 text-[clamp(0.68rem,7.5cqw,1.1rem)]">
        {ctx.winners.map((w) => w.name).join(' · ')}
      </p>
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

function ScoreboardRail({ ctx, side }: { ctx: FloorShowdownCtx; side: 'left' | 'right' }) {
  const edge = side === 'left' ? 'left-0 border-r' : 'right-0 border-l'
  return (
    <div
      className={`absolute top-[10%] bottom-[8%] ${edge} z-[1] flex w-[28%] flex-col border-amber-500/35 bg-black/42`}
    >
      <p className="shrink-0 border-b border-amber-500/30 py-0.5 text-center text-[clamp(0.38rem,4cqw,0.5rem)] font-black uppercase tracking-widest text-amber-100/90">
        {ctx.label}
      </p>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-0.5 px-1 py-1">
        {ctx.namePills.map((w) => (
          <div
            key={`${w.seat}:${w.name}`}
            className="rounded border border-amber-400/35 bg-black/40 px-1 py-0.5"
          >
            <p className="font-mono text-[clamp(0.38rem,4cqw,0.48rem)] font-bold tabular-nums text-amber-300/70">
              S{w.seat}
            </p>
            <p className={WINNER_NAME_TEXT}>{w.name}</p>
          </div>
        ))}
        <ExtraWinnersChip n={ctx.extraWinners} />
      </div>
    </div>
  )
}

function CornerFrameBrackets() {
  const c = 'absolute h-[14%] w-[18%] border-amber-400/55'
  return (
    <>
      <span className={`${c} left-[8%] top-[10%] border-l-2 border-t-2`} aria-hidden />
      <span className={`${c} right-[8%] top-[10%] border-r-2 border-t-2`} aria-hidden />
      <span className={`${c} bottom-[12%] left-[8%] border-b-2 border-l-2`} aria-hidden />
      <span className={`${c} bottom-[12%] right-[8%] border-b-2 border-r-2`} aria-hidden />
    </>
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
          <span className={`min-w-0 flex-1 rounded-r bg-amber-500/25 py-0.5 pl-1 ${WINNER_NAME_TEXT}`}>
            {w.name}
          </span>
        </div>
      ))}
      <ExtraWinnersChip n={ctx.extraWinners} />
    </div>
  )
}

function DiagonalWinnerSash({ ctx }: { ctx: FloorShowdownCtx }) {
  return (
    <div
      className="pointer-events-none absolute -left-[14%] top-[4%] z-[2] w-[72%] -rotate-[34deg] border-y border-amber-400/70 bg-amber-500/88 py-px shadow-sm"
      aria-hidden
    >
      <p className="truncate px-2 text-center font-black uppercase tracking-wide text-amber-950 text-[clamp(0.55rem,6cqw,0.9rem)]">
        ★ {ctx.winners.map((w) => w.name).join(' · ')}
        {ctx.extraWinners > 0 ? ` +${ctx.extraWinners}` : ''}
      </p>
    </div>
  )
}

function VerticalWinnerNames({ ctx }: { ctx: FloorShowdownCtx }) {
  return (
    <div className="absolute right-[3%] top-[14%] bottom-[14%] z-[1] flex w-[22%] flex-col justify-center gap-0.5">
      <DeclLabel ctx={ctx} />
      {ctx.namePills.map((w) => (
        <p key={`${w.seat}:${w.name}`} className={WINNER_NAME_TEXT}>
          {w.name}
        </p>
      ))}
      <ExtraWinnersChip n={ctx.extraWinners} />
    </div>
  )
}

/** Winner declaration only — large card-backed guess lives on the felt layer. */
function renderVariant(ctx: FloorShowdownCtx): ReactNode {
  switch (ctx.variantId) {
    case 1:
      return (
        <div className="absolute inset-x-0 top-0 flex justify-center px-[5%] pt-[2%]">
          <DeclShell className="text-center">
            <DeclLabel ctx={ctx} />
            <WinnerPillsRow ctx={ctx} />
          </DeclShell>
        </div>
      )
    case 2:
      return (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-[5%] pb-[3%]">
          <DeclShell className="text-center">
            <DeclLabel ctx={ctx} />
            <WinnerPillsRow ctx={ctx} />
          </DeclShell>
        </div>
      )
    case 3:
      return (
        <div className="absolute inset-x-0 top-0">
          <GoldTopBanner ctx={ctx} />
        </div>
      )
    case 4:
      return (
        <div className="absolute inset-x-0 bottom-0 px-[4%] pb-[2%]">
          <div className="border-t border-amber-400/45 bg-gradient-to-r from-amber-900/80 via-yellow-800/75 to-amber-900/80 py-1 text-center">
            <DeclLabel ctx={ctx} />
            <WinnerPillsRow ctx={ctx} />
          </div>
        </div>
      )
    case 5:
      return <ScoreboardRail ctx={ctx} side="right" />
    case 6:
      return <ScoreboardRail ctx={ctx} side="left" />
    case 7:
      return (
        <>
          <div className="absolute inset-x-0 top-0">
            <CrownBar ctx={ctx} compact />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-[5%] pb-[3%]">
            <WinnerPillsRow ctx={ctx} />
          </div>
        </>
      )
    case 8:
      return (
        <div className="absolute inset-x-0 bottom-0">
          <StaggerWinners ctx={ctx} />
        </div>
      )
    case 9:
      return (
        <>
          <DiagonalWinnerSash ctx={ctx} />
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-[6%] pb-[3%]">
            <WinnerNamesLine ctx={ctx} className="text-amber-100/95" />
          </div>
        </>
      )
    case 10:
      return (
        <div className="absolute inset-x-0 top-0 flex justify-center px-[5%] pt-[2%]">
          <WinnerPillsRow ctx={ctx} />
        </div>
      )
    case 11:
      return (
        <div className="absolute inset-x-0 bottom-0 px-[5%] pb-[3%] text-center">
          <DeclLabel ctx={ctx} />
          <div className="mt-0.5 space-y-px">
            {ctx.namePills.map((w) => (
              <p key={`${w.seat}:${w.name}`} className={`${WINNER_NAME_TEXT} text-center`}>
                ★ {w.name}
              </p>
            ))}
          </div>
          <ExtraWinnersChip n={ctx.extraWinners} />
        </div>
      )
    case 12:
      return (
        <div className="absolute right-[4%] top-[3%] max-w-[46%]">
          <DeclShell>
            <DeclLabel ctx={ctx} />
            <WinnerPillsRow ctx={ctx} />
          </DeclShell>
        </div>
      )
    case 13:
      return (
        <div className="absolute left-[4%] top-[3%] max-w-[46%]">
          <DeclShell>
            <DeclLabel ctx={ctx} />
            <WinnerPillsRow ctx={ctx} />
          </DeclShell>
        </div>
      )
    case 14:
      return (
        <div className="absolute inset-x-[6%] bottom-[3%] border-t-2 border-white/75 pt-1 text-center">
          <p className="text-[clamp(0.44rem,4.5cqw,0.56rem)] font-black uppercase tracking-[0.24em] text-white/90">
            {ctx.label}
          </p>
          <WinnerNamesLine ctx={ctx} className="font-semibold text-white/90" />
        </div>
      )
    case 15:
      return (
        <>
          <div className="absolute inset-x-0 top-0 pt-[2%]">
            <MarqueeBulbs />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-[5%] pb-[3%]">
            <DeclShell className="text-center">
              <DeclLabel ctx={ctx} />
              <WinnerPillsRow ctx={ctx} />
            </DeclShell>
          </div>
        </>
      )
    case 16:
      return <VerticalWinnerNames ctx={ctx} />
    case 17:
      return (
        <>
          <div className="absolute inset-x-0 top-0">
            {ctx.winners.length > 1 ? <SplitPotBanner /> : <CrownBar ctx={ctx} compact />}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-[5%] pb-[3%]">
            <WinnerPillsRow ctx={ctx} />
          </div>
        </>
      )
    case 18:
      return (
        <>
          <CornerFrameBrackets />
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-[5%] pb-[3%]">
            <DeclShell className="text-center">
              <DeclLabel ctx={ctx} />
              <WinnerNamesLine ctx={ctx} className="font-semibold text-amber-50/95" />
            </DeclShell>
          </div>
        </>
      )
    case 19:
      return (
        <div className="absolute inset-x-0 bottom-[3%] flex justify-center px-[8%]">
          <DeclShell className="text-center">
            <DeclLabel ctx={ctx} />
            <p className={`${WINNER_NAME_TEXT} text-center`}>{ctx.winners[0]?.name}</p>
          </DeclShell>
        </div>
      )
    case 20:
      return (
        <>
          <div className="absolute inset-x-0 bottom-0 pb-[3%]">
            <CrownBar ctx={ctx} compact />
          </div>
          <div className="absolute inset-x-0 bottom-[14%] flex justify-center">
            <WinnerPillsRow ctx={ctx} />
          </div>
        </>
      )
    default:
      return null
  }
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
      className="@container pointer-events-none absolute inset-0 z-[122] overflow-visible rounded-[inherit]"
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
