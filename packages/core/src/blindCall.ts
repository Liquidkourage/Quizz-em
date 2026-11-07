const LADDER: ReadonlyArray<readonly [number, number]> = [
  [10, 20],
  [15, 30],
  [20, 40],
  [25, 50],
  [30, 60],
  [40, 80],
  [50, 100],
  [60, 120],
  [75, 150],
  [100, 200],
  [150, 300],
  [200, 400],
  [300, 600],
  [400, 800],
]

const HOST_SEC = 45
const STREET_FACTOR = 1.65

export type BlindCallInput = {
  minutesLeft: number
  handsLeft: number
  players: number
  medianStack: number
  smallBlind: number
  bigBlind: number
  guideSec: number
  paceSec?: number
}

/** Remaining time if the rest of the rundown is played at one blind pair. */
export type BlindLevelEstimate = {
  smallBlind: number
  bigBlind: number
  minutes: number
}

export type BlindPace = {
  goalMinutes: number
  current: BlindLevelEstimate
  nextLevel: BlindLevelEstimate | null
  closestIncrease: BlindLevelEstimate | null
}

function seatedStack(name: string | undefined, roll: number | undefined): number | null {
  if (!name?.trim()) return null
  if (typeof roll !== 'number' || !Number.isFinite(roll) || roll < 0) return null
  return roll
}

function medianOf(stacks: number[]): number | null {
  if (stacks.length === 0) return null
  const sorted = [...stacks].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]!
  return (sorted[mid - 1]! + sorted[mid]!) / 2
}

export function medianSeatedStack(
  tiles: readonly { seatNames?: readonly string[]; seatBankrolls?: readonly number[] }[],
): number | null {
  const stacks: number[] = []
  for (const tile of tiles) {
    const names = tile.seatNames ?? []
    const rolls = tile.seatBankrolls ?? []
    for (let i = 0; i < names.length; i++) {
      const stack = seatedStack(names[i], rolls[i])
      if (stack != null) stacks.push(stack)
    }
  }
  return medianOf(stacks)
}

function roomSeats(players: number): number {
  const minTables = Math.max(1, Math.ceil(players / 8))
  const maxTables = Math.max(minTables, Math.min(20, Math.floor(players / 2)))
  const tables = Math.min(maxTables, Math.max(minTables, Math.round(players / 6) || 1))
  return Math.min(8, Math.max(2, Math.ceil(players / tables)))
}

function actorFromDepth(depth: number): number {
  const t = Math.min(1, Math.max(0, depth / 40))
  return 0.62 + 0.38 * t
}

function roundGuide(seconds: number): number {
  const n = Number(seconds)
  if (!Number.isFinite(n)) return 45
  return Math.min(300, Math.max(15, Math.round(n / 15) * 15))
}

function predictMinutes(hands: number, players: number, pace: number, depth: number, guide: number): number {
  const betting = roomSeats(players) * pace * STREET_FACTOR * actorFromDepth(depth)
  return (hands * (HOST_SEC + guide + betting)) / 60
}

function minutesAtBlind(input: BlindCallInput, bigBlind: number): number {
  const hands = Math.max(1, Math.floor(input.handsLeft))
  const players = Math.max(2, Math.floor(input.players))
  const depth = input.medianStack / Math.max(1, bigBlind)
  return predictMinutes(hands, players, input.paceSec ?? 20, depth, roundGuide(input.guideSec))
}

function estimate(smallBlind: number, bigBlind: number, input: BlindCallInput): BlindLevelEstimate {
  return { smallBlind, bigBlind, minutes: minutesAtBlind(input, bigBlind) }
}

function increases(input: BlindCallInput): readonly (readonly [number, number])[] {
  return LADDER.filter((level) => level[1] > input.bigBlind)
}

function closestIncrease(input: BlindCallInput): BlindLevelEstimate | null {
  let best: BlindLevelEstimate | null = null
  let bestGap = Infinity
  for (const [smallBlind, bigBlind] of increases(input)) {
    const row = estimate(smallBlind, bigBlind, input)
    const gap = Math.abs(row.minutes - input.minutesLeft)
    if (gap < bestGap) {
      bestGap = gap
      best = row
    }
  }
  return best
}

/** Time left at the blinds in play, one level higher, and the raise nearest the clock. */
export function adviseBlindCall(input: BlindCallInput): BlindPace {
  const higher = increases(input)
  const next = higher[0]
  return {
    goalMinutes: input.minutesLeft,
    current: estimate(input.smallBlind, input.bigBlind, input),
    nextLevel: next ? estimate(next[0], next[1], input) : null,
    closestIncrease: closestIncrease(input),
  }
}
