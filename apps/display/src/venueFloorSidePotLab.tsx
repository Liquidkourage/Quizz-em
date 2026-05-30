import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { cardsUsedFromComposition, type ShowdownResultRow } from './showdownDisplay'

export type SidePotLabStyleId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export const SIDE_POT_LAB_STYLE_COUNT = 7

export const SIDE_POT_LAB_STYLE_NAMES: Record<SidePotLabStyleId, string> = {
  A: 'A — Payout only',
  B: 'B — Side pot ribbon',
  C: 'C — Layer lines',
  D: 'D — Total + breakdown',
  E: 'E — Ladder bars',
  F: 'F — Each + return',
  G: 'G — Layer winners',
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

export const SIDE_POT_LAB_SCENARIO: SidePotLabScenario = {
  main: 300,
  side: 300,
  returnAmount: 250,
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
  const roster = [
    { label: names[0] || 'Short', holes: [2, 4] as [number, number], submitted: 42, payout: 300 },
    { label: names[1] || 'Big', holes: [6, 8] as [number, number], submitted: 99, payout: 250 },
    { label: names[2] || 'Mid', holes: [0, 1] as [number, number], submitted: 50, payout: 300 },
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
  const main =
    rows.find((r) => r.chipPayout === SIDE_POT_LAB_SCENARIO.main && r.submitted === 42) ??
    rows[0]!
  const side =
    rows.find(
      (r) => r.chipPayout === SIDE_POT_LAB_SCENARIO.side && r.submitted != null && r.submitted !== 42
    ) ?? rows[2] ?? rows[1]!
  const returned =
    rows.find((r) => r.chipPayout === SIDE_POT_LAB_SCENARIO.returnAmount) ?? rows[1]!
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
        pot: 150,
        splitWin: true,
        potSubline: 'main layer share',
        winnerLine: `${short.name} · ${mid.name}`,
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
  const line = 'text-[clamp(0.45rem,4cqw,0.6rem)] leading-snug'
  const main = mainName ?? scenario.mainWinner
  const side = sideName ?? scenario.sideWinner
  const ret = returnName ?? scenario.returnTo
  return (
    <div className={`w-full space-y-0.5 text-center ${line}`}>
      <p>
        <span className="font-bold text-amber-300/95">Main ${scenario.main}</span>
        <span className="text-white/80"> → {main}</span>
      </p>
      <p>
        <span className="font-bold text-cyan-300/95">Side ${scenario.side}</span>
        <span className="text-white/80"> → {side}</span>
      </p>
      <p className="text-white/50">
        Return ${scenario.returnAmount} → {ret}
      </p>
    </div>
  )
}

export function SidePotRibbon() {
  return (
    <div className="shrink-0 bg-cyan-900/90 py-1 text-center">
      <p className="text-[clamp(0.5rem,5cqw,0.7rem)] font-black uppercase tracking-widest text-cyan-100">
        Side pot
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
