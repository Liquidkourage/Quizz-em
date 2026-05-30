import type { ReactNode } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  cardsUsedFromComposition,
  pickShowdownFloorChipRow,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import { WinningGuessCard } from './venueFloorShowdownGuessCard'

export type VenueFloorShowdownVariantId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20

export const VENUE_FLOOR_SHOWDOWN_VARIANT_COUNT = 20

export const VENUE_FLOOR_SHOWDOWN_VARIANT_NAMES: Record<VenueFloorShowdownVariantId, string> = {
  1: 'Center stack',
  2: 'Yellow wash',
  3: 'Gold header',
  4: 'Star names · footer rule',
  5: 'Cyan frame',
  6: 'Emerald frame',
  7: 'Crown + chip pot',
  8: 'Marquee bulbs',
  9: 'Noir stack',
  10: 'Rose split ribbon',
  11: 'Chip pot center',
  12: 'Chip pot compact',
  13: 'Amber border panel',
  14: 'Noir underline',
  15: 'Marquee strip',
  16: 'Inset panel',
  17: 'Split ribbon + wash',
  18: 'Corner brackets',
  19: 'Tight stack',
  20: 'Cyan vault',
}

export function venueFloorShowdownVariantForTable(tableNum: number): VenueFloorShowdownVariantId {
  const n = ((Math.floor(tableNum) - 1) % VENUE_FLOOR_SHOWDOWN_VARIANT_COUNT) + 1
  return n as VenueFloorShowdownVariantId
}

export type FloorShowdownCtx = {
  variantId: VenueFloorShowdownVariantId
  tableNum: number
  labMode: boolean
  pot: number
  label: string
  winners: ShowdownResultRow[]
  chipRow: ShowdownResultRow | null
  guess: string | null
  namePills: ShowdownResultRow[]
  extraWinners: number
  splitWin: boolean
  ariaLabel: string
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
    pot,
    label,
    winners,
    chipRow,
    guess,
    namePills,
    extraWinners,
    splitWin: winners.length > 1,
    ariaLabel: `${label}: ${winners.map((w) => w.name).join(', ')}`,
  }
}

export function synthesizeLabShowdownRows(tile: DisplayVenueTileSnapshot): {
  rows: ShowdownResultRow[]
  correctAnswer: number
} {
  const board = [4, 0, 2, 5, 6] as const
  const correctAnswer = 40
  const names = (tile.seatNames ?? []).map((n) => (typeof n === 'string' ? n.trim() : ''))
  const seated = names.filter((n) => n.length > 0)
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
      submitted: winnerSeats.includes(i) ? winningSubmitted : winningSubmitted + 3.5,
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

/**
 * Floor showdown type scale (@container on overlay). Visual hierarchy:
 * 1 winner names (largest) → 2 pot amount → 3 winning answer card.
 */
const WINNER_LABEL =
  'font-bold uppercase tracking-[0.16em] text-amber-200/90 text-[clamp(0.5rem,4cqw,0.65rem)]'
const WINNER_NAME =
  'min-w-0 font-black leading-[1.05] text-amber-50 text-[clamp(1rem,12cqw,2.15rem)]'
const POT_LABEL =
  'font-black uppercase tracking-[0.28em] text-yellow-200/80 text-[clamp(0.45rem,3.5cqw,0.58rem)]'
const POT_AMOUNT =
  'font-mono font-black tabular-nums leading-none text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-[clamp(1.05rem,11cqw,2.4rem)]'

function VariantBadge({ ctx }: { ctx: FloorShowdownCtx }) {
  if (!ctx.labMode) return null
  return (
    <span
      className="absolute right-1 top-1 z-[10] rounded border border-white/25 bg-black/85 px-1 py-px font-mono text-[0.42rem] font-bold tabular-nums text-white/75"
      title={VENUE_FLOOR_SHOWDOWN_VARIANT_NAMES[ctx.variantId]}
    >
      #{String(ctx.variantId).padStart(2, '0')}
    </span>
  )
}

function HeroPot({ pot, className = '' }: { pot: number; className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <p className={POT_LABEL}>Pot</p>
      <p className={POT_AMOUNT}>{formatPot(pot)}</p>
    </div>
  )
}

function PotChip({ pot }: { pot: number }) {
  return (
    <div className="inline-flex flex-col items-center rounded-xl border-2 border-yellow-500/55 bg-gradient-to-b from-yellow-900/90 via-amber-950/92 to-black/90 px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.6)]">
      <HeroPot pot={pot} />
    </div>
  )
}

function WinnerBlock({ ctx, layout = 'pills' }: { ctx: FloorShowdownCtx; layout?: 'pills' | 'stars' | 'line' }) {
  if (layout === 'line') {
    return (
      <div className="min-w-0 text-center">
        <p className={WINNER_LABEL}>{ctx.label}</p>
        <p className={`${WINNER_NAME} truncate`}>
          {ctx.winners.map((w) => w.name).join(' · ')}
          {ctx.extraWinners > 0 ? ` +${ctx.extraWinners}` : ''}
        </p>
      </div>
    )
  }
  if (layout === 'stars') {
    return (
      <div className="min-w-0 space-y-1 text-center">
        <p className={WINNER_LABEL}>{ctx.label}</p>
        {ctx.namePills.map((w) => (
          <p key={`${w.seat}:${w.name}`} className={`${WINNER_NAME} truncate`}>
            ★ {w.name}
          </p>
        ))}
        {ctx.extraWinners > 0 ? (
          <p className="text-[clamp(0.55rem,5cqw,0.75rem)] font-bold text-amber-200/80">+{ctx.extraWinners}</p>
        ) : null}
      </div>
    )
  }
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <p className={WINNER_LABEL}>{ctx.label}</p>
      <div className="flex max-w-full flex-wrap justify-center gap-1">
        {ctx.namePills.map((w) => (
          <span
            key={`${w.seat}:${w.name}`}
            className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border-2 border-amber-400/80 bg-amber-950/95 px-2 py-0.5 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
          >
            <span className="shrink-0 text-[clamp(0.55rem,5cqw,0.75rem)] font-black text-amber-400">
              ★
            </span>
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

function GuessBlock(ctx: FloorShowdownCtx, size: 'sm' | 'md' | 'lg' | 'xl' = 'lg') {
  if (!ctx.guess) return null
  return (
    <WinningGuessCard
      guess={ctx.guess}
      variantId={ctx.variantId}
      splitWin={ctx.splitWin}
      size={size}
    />
  )
}

type WinnerLayout = 'pills' | 'stars' | 'line'
type PotStyle = 'hero' | 'chip'

/** Canonical order: winner declaration → pot → winning answer card. */
function ShowdownStack({
  ctx,
  winnerLayout = 'line',
  potStyle = 'hero',
  guessSize = 'md',
  className = '',
  gapClass = 'gap-2',
}: {
  ctx: FloorShowdownCtx
  winnerLayout?: WinnerLayout
  potStyle?: PotStyle
  guessSize?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  gapClass?: string
}) {
  return (
    <div className={`flex min-h-0 min-w-0 flex-col items-center ${gapClass} ${className}`}>
      <div className="w-full max-w-full shrink-0 flex-[1.15]">
        <WinnerBlock ctx={ctx} layout={winnerLayout} />
      </div>
      <div className="w-full shrink-0 flex-none">
        {potStyle === 'chip' ? <PotChip pot={ctx.pot} /> : <HeroPot pot={ctx.pot} />}
      </div>
      <div className="flex w-full min-h-0 flex-[0.85] items-center justify-center">
        {GuessBlock(ctx, guessSize)}
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
  switch (ctx.variantId) {
    case 1:
      return (
        <div className="flex min-h-0 flex-1 px-3 py-3">
          <ShowdownStack ctx={ctx} winnerLayout="line" guessSize="lg" className="flex-1 justify-center" gapClass="gap-2" />
        </div>
      )
    case 2:
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <ShowdownStack
            ctx={ctx}
            winnerLayout="line"
            className="flex-1 justify-center border-b-2 border-yellow-500/40 bg-gradient-to-b from-yellow-950/50 to-transparent px-3 py-3"
            gapClass="gap-3"
          />
        </div>
      )
    case 3:
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 bg-gradient-to-r from-amber-600/95 via-yellow-500/90 to-amber-600/95 py-1 text-center">
            <p className="text-[clamp(0.42rem,4cqw,0.55rem)] font-black uppercase text-amber-950">Showdown</p>
          </div>
          <ShowdownStack ctx={ctx} className="flex-1 justify-center px-3 py-2" />
        </div>
      )
    case 4:
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <ShowdownStack
            ctx={ctx}
            winnerLayout="stars"
            guessSize="lg"
            className="flex-1 justify-center px-3 py-2"
          />
          <div className="shrink-0 border-t-2 border-amber-400/50 bg-amber-950/40 py-1" aria-hidden />
        </div>
      )
    case 5:
      return (
        <div className="m-2 flex min-h-0 flex-1 rounded-lg border border-cyan-500/40 bg-black/50 p-2">
          <ShowdownStack ctx={ctx} className="flex-1 justify-center" />
        </div>
      )
    case 6:
      return (
        <div className="m-2 flex min-h-0 flex-1 flex-col rounded-lg border-2 border-emerald-500/45 p-2">
          <ShowdownStack ctx={ctx} winnerLayout="line" className="flex-1 justify-center" />
        </div>
      )
    case 7:
      return (
        <div className="flex min-h-0 flex-1 flex-col px-2 py-2">
          <div className="shrink-0 rounded-t-lg bg-gradient-to-r from-amber-600/95 via-yellow-500/90 to-amber-600/95 py-1 text-center">
            <p className="text-[clamp(0.45rem,4.5cqw,0.58rem)] font-black uppercase text-amber-950">👑 Crown</p>
          </div>
          <ShowdownStack
            ctx={ctx}
            potStyle="chip"
            className="flex-1 justify-center rounded-b-lg border border-amber-500/35 bg-black/55 px-2 py-2"
          />
        </div>
      )
    case 8:
      return (
        <div className="flex min-h-0 flex-1 flex-col px-2 py-2">
          <div className="flex shrink-0 justify-center gap-1 py-1">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)] motion-safe:animate-[venue-bulb_1.4s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.1}s` }}
                aria-hidden
              />
            ))}
          </div>
          <ShowdownStack ctx={ctx} winnerLayout="line" guessSize="md" className="flex-1 justify-center" />
        </div>
      )
    case 9:
      return (
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-neutral-950/90 to-black/95 px-3 py-3">
          <ShowdownStack
            ctx={ctx}
            winnerLayout="line"
            className="flex-1 justify-center [&_.text-yellow-300]:text-white"
          />
        </div>
      )
    case 10:
      return (
        <div className="flex min-h-0 flex-1 flex-col px-2 py-2">
          {ctx.splitWin ? <SplitPotRibbon /> : null}
          <ShowdownStack ctx={ctx} winnerLayout="stars" className="flex-1 justify-center" />
        </div>
      )
    case 11:
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center px-3 py-2">
          <ShowdownStack ctx={ctx} potStyle="chip" guessSize="md" className="flex-1 justify-center" gapClass="gap-3" />
        </div>
      )
    case 12:
      return (
        <div className="relative flex min-h-0 flex-1 px-3 py-3">
          <ShowdownStack ctx={ctx} potStyle="chip" guessSize="lg" className="flex-1 justify-center" gapClass="gap-2" />
        </div>
      )
    case 13:
      return (
        <div className="flex min-h-0 flex-1 border border-amber-500/30 bg-black/40">
          <ShowdownStack
            ctx={ctx}
            winnerLayout="stars"
            potStyle="chip"
            className="flex-1 justify-center px-3 py-2"
          />
        </div>
      )
    case 14:
      return (
        <div className="flex min-h-0 flex-1 flex-col border-t-2 border-white/70 bg-black/50 px-3 py-2">
          <ShowdownStack ctx={ctx} winnerLayout="line" className="flex-1 justify-center [&_.text-amber-50]:text-white/95" />
        </div>
      )
    case 15:
      return (
        <div className="flex min-h-0 flex-1 flex-col px-2 py-2">
          <div className="flex shrink-0 justify-center gap-1 py-1">
            {Array.from({ length: 7 }, (_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-amber-300 motion-safe:animate-[venue-bulb_1.4s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.1}s` }}
                aria-hidden
              />
            ))}
          </div>
          <ShowdownStack ctx={ctx} guessSize="md" className="flex-1 justify-center" />
        </div>
      )
    case 16:
      return (
        <div className="flex min-h-0 flex-1 px-2 py-2">
          <ShowdownStack
            ctx={ctx}
            winnerLayout="line"
            guessSize="sm"
            className="flex-1 justify-center rounded-lg border border-amber-500/25 bg-black/45 p-2"
          />
        </div>
      )
    case 17:
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          {ctx.splitWin ? <SplitPotRibbon /> : null}
          <ShowdownStack
            ctx={ctx}
            winnerLayout="stars"
            guessSize="lg"
            className="flex-1 justify-center bg-gradient-to-b from-yellow-950/35 to-transparent px-3 py-3"
            gapClass="gap-3"
          />
        </div>
      )
    case 18:
      return (
        <div className="relative m-2 flex min-h-0 flex-1">
          <span className="absolute left-1 top-1 h-5 w-7 border-l-2 border-t-2 border-amber-400/60" aria-hidden />
          <span className="absolute right-1 top-1 h-5 w-7 border-r-2 border-t-2 border-amber-400/60" aria-hidden />
          <span className="absolute bottom-1 left-1 h-5 w-7 border-b-2 border-l-2 border-amber-400/60" aria-hidden />
          <span className="absolute bottom-1 right-1 h-5 w-7 border-b-2 border-r-2 border-amber-400/60" aria-hidden />
          <ShowdownStack ctx={ctx} className="flex-1 justify-center px-2 py-2" />
        </div>
      )
    case 19:
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-3">
          <ShowdownStack ctx={ctx} winnerLayout="stars" guessSize="md" gapClass="gap-2.5" />
        </div>
      )
    case 20:
      return (
        <div className="flex min-h-0 flex-1 flex-col rounded-[inherit] border border-cyan-500/35 bg-gradient-to-b from-cyan-950/75 to-black/88">
          <ShowdownStack ctx={ctx} winnerLayout="line" className="flex-1 justify-center px-3 py-2" />
        </div>
      )
    default:
      return null
  }
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
      {renderVariant(ctx)}
    </div>
  )
}

export function VenueFloorShowdownVariantStyles() {
  return (
    <style>{`
      @keyframes venue-bulb {
        0%, 100% { opacity: 0.45; transform: scale(0.85); }
        50% { opacity: 1; transform: scale(1.05); }
      }
    `}</style>
  )
}
