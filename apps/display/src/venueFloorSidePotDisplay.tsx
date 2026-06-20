import type { ShowdownResultRow } from './showdownDisplay'
import { VENUE_FLOOR_MOSAIC_CHROME } from './venueFloorGridLayout'

/** Same gold badge as wagering mosaic cards — consistent table id on showdown overlays. */
export function ShowdownTableBadge({ tableNum }: { tableNum: number }) {
  return (
    <span
      className={`${VENUE_FLOOR_MOSAIC_CHROME.tableNumBadge} vfd-mosaic-table-num`}
      aria-hidden
    >
      {tableNum}
    </span>
  )
}

export type ShowdownSidePotLine = {
  label: 'Main' | 'Side' | 'Return'
  amount: number
  name: string
}

/** Equal side columns so the amount column sits on the tile’s horizontal center. */
const POT_LAYER_ROW =
  'grid w-full max-w-full min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-baseline gap-x-[clamp(0.15rem,1.2cqw,0.35rem)] px-0.5'
const POT_LAYER_TAG =
  'justify-self-end pr-[0.15em] font-black uppercase tracking-[0.1em] text-[clamp(0.74rem,7.4cqw,1.14rem)]'
const POT_LAYER_AMOUNT_MAIN =
  'justify-self-center text-center font-mono font-black tabular-nums leading-none text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-[clamp(1.32rem,14.4cqw,2.95rem)]'
const POT_LAYER_AMOUNT_SIDE =
  'justify-self-center text-center font-mono font-black tabular-nums leading-none text-yellow-300/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] text-[clamp(1.2rem,13cqw,2.55rem)]'
const POT_LAYER_AMOUNT_RETURN =
  'justify-self-center text-center font-mono font-bold tabular-nums leading-none text-white/75 text-[clamp(0.98rem,9.8cqw,1.75rem)]'
const POT_LAYER_NAME =
  'min-w-0 justify-self-start pl-[0.15em] truncate font-black leading-tight text-amber-50 text-[clamp(0.9rem,9.4cqw,1.55rem)]'
const POT_LAYER_NAME_SIDE =
  'min-w-0 justify-self-start pl-[0.15em] truncate font-semibold leading-tight text-amber-50/92 text-[clamp(0.78rem,8cqw,1.28rem)]'

function PotLayerRow({
  line,
  tagClass,
  amountClass,
  nameClass = POT_LAYER_NAME,
}: {
  line: ShowdownSidePotLine
  tagClass: string
  amountClass: string
  nameClass?: string
}) {
  return (
    <p className={POT_LAYER_ROW}>
      <span className={`${POT_LAYER_TAG} ${tagClass}`}>{line.label}</span>
      <span className={amountClass}>${line.amount.toLocaleString()}</span>
      <span className={nameClass} title={line.name}>
        {line.name}
      </span>
    </p>
  )
}

export function ShowdownPotWinnerList({ lines }: { lines: readonly ShowdownSidePotLine[] }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col items-stretch justify-evenly gap-y-0.5 py-0.5">
      {lines.map((line) => {
        if (line.label === 'Main') {
          return (
            <PotLayerRow
              key={`${line.label}:${line.name}`}
              line={line}
              tagClass="text-amber-200"
              amountClass={POT_LAYER_AMOUNT_MAIN}
            />
          )
        }
        if (line.label === 'Side') {
          return (
            <PotLayerRow
              key={`${line.label}:${line.name}`}
              line={line}
              tagClass="text-cyan-200"
              amountClass={POT_LAYER_AMOUNT_SIDE}
              nameClass={POT_LAYER_NAME_SIDE}
            />
          )
        }
        return (
          <PotLayerRow
            key={`${line.label}:${line.name}`}
            line={line}
            tagClass="text-white/45"
            amountClass={POT_LAYER_AMOUNT_RETURN}
            nameClass={`${POT_LAYER_NAME} text-white/60`}
          />
        )
      })}
    </div>
  )
}

/** Infer main / side / return lines from per-seat chip payouts until showdownPotLayers is on the wire. */
export function resolveShowdownSidePotLines(
  rows: ShowdownResultRow[],
  correctAnswer: number | undefined
): ShowdownSidePotLine[] | null {
  const paid = rows.filter(
    (r) => !r.hasFolded && typeof r.chipPayout === 'number' && r.chipPayout > 0
  )
  if (paid.length < 2) return null
  const amounts = paid.map((r) => r.chipPayout!)
  if (amounts.every((p) => p === amounts[0])) return null

  const ranked = paid
    .map((r) => {
      const distance =
        typeof correctAnswer === 'number' && r.submitted != null
          ? Math.abs(r.submitted - correctAnswer)
          : Infinity
      return { row: r, distance }
    })
    .sort((a, b) => a.distance - b.distance)

  const main = ranked[0]!.row
  const lines: ShowdownSidePotLine[] = [
    { label: 'Main', amount: main.chipPayout!, name: main.name },
  ]

  for (const { row, distance } of ranked.slice(1)) {
    const payout = row.chipPayout!
    if (payout === main.chipPayout && distance > ranked[0]!.distance) {
      lines.push({ label: 'Return', amount: payout, name: row.name })
      continue
    }
    if (payout < main.chipPayout! && !lines.some((l) => l.label === 'Side' && l.name === row.name)) {
      lines.push({ label: 'Side', amount: payout, name: row.name })
    }
  }

  return lines.length >= 2 ? lines : null
}

export const SHOWDOWN_RIBBON_BAR = 'relative shrink-0 py-1.5'
export const SHOWDOWN_RIBBON_LABEL =
  'font-black uppercase leading-none tracking-[0.16em] text-[clamp(0.74rem,8.2cqw,1.25rem)]'

/** Plain winner — light title strip (no full-width bar); saves vertical space on dense floors. */
export function WinnerTitleStrip({ tableNum }: { tableNum?: number } = {}) {
  return (
    <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1 px-1.5 pb-0.5 pt-1">
      {tableNum != null ? <ShowdownTableBadge tableNum={tableNum} /> : <span className="w-0" aria-hidden />}
      <p className="text-center font-black uppercase leading-none tracking-[0.14em] text-amber-200/92 text-[clamp(0.68rem,7.2cqw,1.05rem)]">
        Winner
      </p>
    </div>
  )
}

function ShowdownRibbonBar({
  tableNum,
  barClassName,
  labelClassName,
  label,
}: {
  tableNum?: number
  barClassName: string
  labelClassName: string
  label: string
}) {
  return (
    <div
      className={`${SHOWDOWN_RIBBON_BAR} ${barClassName} flex items-center justify-center px-1.5 sm:px-2`}
    >
      {tableNum != null ? (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 sm:left-2">
          <ShowdownTableBadge tableNum={tableNum} />
        </span>
      ) : null}
      <p className={`${SHOWDOWN_RIBBON_LABEL} ${labelClassName} px-6 text-center`}>{label}</p>
    </div>
  )
}

export function SidePotRibbon({ tableNum }: { tableNum?: number } = {}) {
  return (
    <ShowdownRibbonBar
      tableNum={tableNum}
      barClassName="bg-gradient-to-r from-cyan-950/98 via-teal-800/95 to-cyan-950/98 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
      labelClassName="text-cyan-50"
      label="Side pot"
    />
  )
}

/** @deprecated Use {@link WinnerTitleStrip} for plain winners on mosaic tiles. */
export function WinnerRibbon({ tableNum }: { tableNum?: number } = {}) {
  return <WinnerTitleStrip tableNum={tableNum} />
}

export function SplitPotRibbon({ tableNum }: { tableNum?: number } = {}) {
  return (
    <ShowdownRibbonBar
      tableNum={tableNum}
      barClassName="bg-gradient-to-r from-rose-800/98 via-amber-600/96 to-rose-800/98 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      labelClassName="text-white"
      label="Split pot"
    />
  )
}
