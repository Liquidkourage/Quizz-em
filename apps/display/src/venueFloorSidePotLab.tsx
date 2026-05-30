import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { cardsUsedFromComposition, type ShowdownResultRow } from './showdownDisplay'

export type SidePotLabStyleId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export const SIDE_POT_LAB_STYLE_COUNT = 7

export const SIDE_POT_LAB_STYLE_NAMES: Record<SidePotLabStyleId, string> = {
  A: 'Side pot · ribbon + winners',
  B: 'Side pot · ribbon + winners',
  C: 'Side pot · ribbon + winners',
  D: 'Side pot · ribbon + winners',
  E: 'Side pot · ribbon + winners',
  F: 'Side pot · ribbon + winners',
  G: 'Side pot · ribbon + winners',
}

const STYLES: readonly SidePotLabStyleId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export function sidePotLabStyleForTable(tableNum: number, labMode: boolean): SidePotLabStyleId | null {
  if (!labMode || tableNum < 1 || tableNum > SIDE_POT_LAB_STYLE_COUNT) return null
  return STYLES[tableNum - 1]!
}

export type SidePotLabLayer = {
  label: 'Main' | 'Side'
  amount: number
  eligibleCount: number
}

export type SidePotLabScenario = {
  main: number
  side: number
  returnAmount: number
  returnTo: string
  mainWinner: string
  sideWinner: string
}

/** Unequal stacks (100 / 200 / 500) → main $300, side $200, $300 uncalled return — layers rarely match. */
function formatPot(amount: number): string {
  return `$${Math.max(0, Math.round(amount)).toLocaleString()}`
}

export const SIDE_POT_LAB_SCENARIO: SidePotLabScenario = {
  main: 300,
  side: 200,
  returnAmount: 300,
  returnTo: 'Big',
  mainWinner: 'Short',
  sideWinner: 'Mid',
}

export function isSidePotLabTable(tableNum: number, labMode: boolean): boolean {
  return labMode && tableNum >= 1 && tableNum <= SIDE_POT_LAB_STYLE_COUNT
}

/** Lab rows: Short wins main, Mid wins side, Big gets uncalled return (core sidePots.test). */
export function synthesizeSidePotLabRows(
  tile: DisplayVenueTileSnapshot,
  composition: readonly { source: 'community' | 'hole'; index: number }[],
  board: readonly number[]
): { rows: ShowdownResultRow[]; correctAnswer: number } {
  const correctAnswer = 42
  const names = (tile.seatNames ?? []).map((n) => (typeof n === 'string' ? n.trim() : ''))
  const s = SIDE_POT_LAB_SCENARIO
  const roster = [
    { label: names[0] || 'Short', holes: [2, 4] as [number, number], submitted: 42, payout: s.main },
    { label: names[1] || 'Big', holes: [6, 8] as [number, number], submitted: 99, payout: s.returnAmount },
    { label: names[2] || 'Mid', holes: [0, 1] as [number, number], submitted: 50, payout: s.side },
  ]

  const rows: ShowdownResultRow[] = roster.map((r, i) => ({
    seat: i + 1,
    name: r.label,
    holes: r.holes,
    submitted: r.submitted,
    hasFolded: false,
    communityBoard: [...board],
    answerCommunityIndices: [0, 1, 2, 3],
    answerCards: cardsUsedFromComposition(composition, r.holes, board),
    chipPayout: r.payout,
  }))

  return { rows, correctAnswer }
}

export type SidePotLabDisplay = {
  pot: number
  splitWin: boolean
  potSubline?: string
  layers: SidePotLabLayer[]
  potReturn?: { name: string; amount: number }
  winnerLine: string
  showSidePotRibbon: boolean
  showSplitPotRibbon: boolean
}

function labRosterRows(rows: ShowdownResultRow[]) {
  const s = SIDE_POT_LAB_SCENARIO
  const main =
    rows.find((r) => r.chipPayout === s.main && r.submitted === 42) ?? rows[0]!
  const side =
    rows.find((r) => r.chipPayout === s.side && r.submitted != null && r.submitted !== 42) ??
    rows[2] ??
    rows[1]!
  const returned = rows.find((r) => r.chipPayout === s.returnAmount && r.submitted !== 42) ?? rows[1]!
  return { main, side, returned }
}

export function sidePotLabDisplay(style: SidePotLabStyleId, rows: ShowdownResultRow[]): SidePotLabDisplay {
  const s = SIDE_POT_LAB_SCENARIO
  const { main: short, side: mid, returned: big } = labRosterRows(rows)
  const layers: SidePotLabLayer[] = [
    { label: 'Main', amount: s.main, eligibleCount: 3 },
    { label: 'Side', amount: s.side, eligibleCount: 2 },
  ]

  const base = { layers, potReturn: { name: big.name, amount: s.returnAmount } }

  switch (style) {
    case 'A':
      return {
        ...base,
        pot: s.main,
        splitWin: false,
        winnerLine: short.name,
        showSidePotRibbon: false,
        showSplitPotRibbon: false,
      }
    case 'B':
      return {
        ...base,
        pot: s.main,
        splitWin: false,
        potSubline: `${short.name} main · ${mid.name} side`,
        winnerLine: `${short.name} · ${mid.name}`,
        showSidePotRibbon: true,
        showSplitPotRibbon: false,
      }
    case 'C':
      return {
        ...base,
        pot: s.main,
        splitWin: false,
        potSubline: `${short.name} wins main`,
        winnerLine: short.name,
        showSidePotRibbon: false,
        showSplitPotRibbon: false,
      }
    case 'D':
      return {
        ...base,
        pot: s.main + s.side,
        splitWin: false,
        potSubline: `${s.main} main + ${s.side} side`,
        winnerLine: short.name,
        showSidePotRibbon: false,
        showSplitPotRibbon: false,
      }
    case 'E':
      return {
        ...base,
        pot: s.main,
        splitWin: false,
        winnerLine: short.name,
        showSidePotRibbon: false,
        showSplitPotRibbon: false,
      }
    case 'F':
      return {
        ...base,
        pot: s.side,
        splitWin: false,
        potSubline: `${short.name} took main ${formatPot(s.main)}`,
        winnerLine: `${mid.name} · side pot`,
        showSidePotRibbon: true,
        showSplitPotRibbon: false,
      }
    case 'G':
      return {
        ...base,
        pot: 0,
        splitWin: false,
        winnerLine: '',
        showSidePotRibbon: false,
        showSplitPotRibbon: false,
      }
    default:
      return {
        ...base,
        pot: s.main,
        splitWin: false,
        winnerLine: short.name,
        showSidePotRibbon: false,
        showSplitPotRibbon: false,
      }
  }
}

const LAYER_LINE =
  'text-[clamp(0.42rem,3.8cqw,0.58rem)] leading-snug text-white/75'
const LAYER_AMT = 'font-mono font-bold tabular-nums text-yellow-300/95'

export function PotLayerRows({ layers }: { layers: SidePotLabLayer[] }) {
  return (
    <div className="w-full space-y-0.5 text-center">
      {layers.map((layer) => (
        <p key={layer.label} className={LAYER_LINE}>
          {layer.label}{' '}
          <span className={LAYER_AMT}>${layer.amount.toLocaleString()}</span>
          <span className="text-white/45"> · {layer.eligibleCount} players</span>
        </p>
      ))}
    </div>
  )
}

export function PotLadderBars({ layers }: { layers: SidePotLabLayer[] }) {
  const max = Math.max(...layers.map((l) => l.amount), 1)
  return (
    <div className="w-full max-w-[92%] space-y-1 px-1">
      {layers.map((layer) => (
        <div key={layer.label}>
          <div className="flex justify-between text-[clamp(0.4rem,3.5cqw,0.52rem)] text-white/55">
            <span>{layer.label}</span>
            <span className="font-mono tabular-nums">${layer.amount}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-sm bg-white/10">
            <div
              className="h-full rounded-sm bg-amber-500/85"
              style={{ width: `${(layer.amount / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PotReturnNote({ name, amount }: { name: string; amount: number }) {
  return (
    <p className="text-center text-[clamp(0.42rem,3.6cqw,0.55rem)] font-medium text-white/50">
      Uncalled return ${amount.toLocaleString()} → {name}
    </p>
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

export function sidePotLinesFromLabRows(rows: ShowdownResultRow[]): ShowdownSidePotLine[] {
  const s = SIDE_POT_LAB_SCENARIO
  const { main, side, returned } = labRosterRows(rows)
  return [
    { label: 'Main', amount: s.main, name: main.name },
    { label: 'Side', amount: s.side, name: side.name },
    { label: 'Return', amount: s.returnAmount, name: returned.name },
  ]
}

/** Infer main / side / return lines from per-seat chip payouts (no layer wire yet). */
export function inferSidePotLinesFromRows(
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

export function resolveShowdownSidePotLines(
  rows: ShowdownResultRow[],
  correctAnswer: number | undefined,
  tableNum: number,
  labMode: boolean
): ShowdownSidePotLine[] | null {
  if (isSidePotLabTable(tableNum, labMode)) {
    return sidePotLinesFromLabRows(rows)
  }
  return inferSidePotLinesFromRows(rows, correctAnswer)
}

export function PotDetailLines({
  scenario,
  mainName,
  sideName,
  returnName,
}: {
  scenario: SidePotLabScenario
  mainName?: string
  sideName?: string
  returnName?: string
}) {
  const lines: ShowdownSidePotLine[] = [
    { label: 'Main', amount: scenario.main, name: mainName ?? scenario.mainWinner },
    { label: 'Side', amount: scenario.side, name: sideName ?? scenario.sideWinner },
    {
      label: 'Return',
      amount: scenario.returnAmount,
      name: returnName ?? scenario.returnTo,
    },
  ]
  return <ShowdownPotWinnerList lines={lines} />
}

export function SidePotRibbon() {
  return (
    <div className="shrink-0 bg-cyan-900/90 py-0.5 text-center">
      <p className="text-[clamp(0.45rem,4.2cqw,0.62rem)] font-black uppercase tracking-widest text-cyan-100">
        Side pot
      </p>
    </div>
  )
}

export function WinnerRibbon() {
  return (
    <div className="shrink-0 bg-amber-900/92 py-0.5 text-center">
      <p className="text-[clamp(0.45rem,4.2cqw,0.62rem)] font-black uppercase tracking-widest text-amber-100">
        Winner
      </p>
    </div>
  )
}

export function SidePotLabBadge({ style }: { style: SidePotLabStyleId }) {
  return (
    <span
      className="absolute right-1 top-1 z-[10] rounded border border-cyan-400/40 bg-black/85 px-1 py-px font-mono text-[0.42rem] font-bold text-cyan-100/90"
      title={SIDE_POT_LAB_STYLE_NAMES[style]}
    >
      {style}
    </span>
  )
}
