import type { ShowdownResultRow } from './showdownDisplay'

export type ShowdownSidePotLine = {
  label: 'Main' | 'Side' | 'Return'
  amount: number
  name: string
}

/** Equal side columns so the amount column sits on the tile’s horizontal center. */
const POT_LAYER_ROW =
  'grid w-full max-w-full min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-baseline gap-x-[clamp(0.15rem,1.2cqw,0.35rem)] px-0.5'
const POT_LAYER_TAG =
  'justify-self-end pr-[0.15em] font-black uppercase tracking-[0.1em] text-[clamp(0.62rem,6.2cqw,0.95rem)]'
const POT_LAYER_AMOUNT_MAIN =
  'justify-self-center text-center font-mono font-black tabular-nums leading-none text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] text-[clamp(1.1rem,12cqw,2.45rem)]'
const POT_LAYER_AMOUNT_SIDE =
  'justify-self-center text-center font-mono font-black tabular-nums leading-none text-yellow-300/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] text-[clamp(1rem,10.8cqw,2.15rem)]'
const POT_LAYER_AMOUNT_RETURN =
  'justify-self-center text-center font-mono font-bold tabular-nums leading-none text-white/75 text-[clamp(0.82rem,8.2cqw,1.45rem)]'
const POT_LAYER_NAME =
  'min-w-0 justify-self-start pl-[0.15em] truncate font-black leading-tight text-amber-50 text-[clamp(0.75rem,7.8cqw,1.3rem)]'

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
              tagClass="text-amber-300/90"
              amountClass={POT_LAYER_AMOUNT_MAIN}
            />
          )
        }
        if (line.label === 'Side') {
          return (
            <PotLayerRow
              key={`${line.label}:${line.name}`}
              line={line}
              tagClass="text-cyan-300/90"
              amountClass={POT_LAYER_AMOUNT_SIDE}
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

export const SHOWDOWN_RIBBON_BAR = 'shrink-0 py-1.5'
export const SHOWDOWN_RIBBON_LABEL =
  'font-black uppercase leading-none tracking-[0.16em] text-[clamp(0.62rem,6.8cqw,1.05rem)]'
const SHOWDOWN_RIBBON_TABLE_NUM =
  'font-mono font-black tabular-nums leading-none text-yellow-400/95 text-[clamp(0.72rem,6.2cqw,1rem)]'

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
      className={`${SHOWDOWN_RIBBON_BAR} ${barClassName} grid grid-cols-[1fr_auto_1fr] items-center px-1.5 sm:px-2`}
    >
      <span className={`${SHOWDOWN_RIBBON_TABLE_NUM} justify-self-start`}>
        {tableNum ?? ''}
      </span>
      <p className={`${SHOWDOWN_RIBBON_LABEL} ${labelClassName} justify-self-center text-center`}>
        {label}
      </p>
      <span className="justify-self-end" aria-hidden />
    </div>
  )
}

export function SidePotRibbon({ tableNum }: { tableNum?: number } = {}) {
  return (
    <ShowdownRibbonBar
      tableNum={tableNum}
      barClassName="bg-cyan-900/90"
      labelClassName="text-cyan-100"
      label="Side pot"
    />
  )
}

export function WinnerRibbon({ tableNum }: { tableNum?: number } = {}) {
  return (
    <ShowdownRibbonBar
      tableNum={tableNum}
      barClassName="bg-amber-900/92"
      labelClassName="text-amber-100"
      label="Winner"
    />
  )
}

export function SplitPotRibbon({ tableNum }: { tableNum?: number } = {}) {
  return (
    <ShowdownRibbonBar
      tableNum={tableNum}
      barClassName="bg-gradient-to-r from-rose-700/95 via-amber-600/95 to-rose-700/95"
      labelClassName="text-white"
      label="Split pot"
    />
  )
}
