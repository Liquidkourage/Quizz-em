import type { PlayerState } from './index'
import { computeOptimalTableCount, splitIntoTableSizes } from './index'

function shuffleWithRng<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

/** Max seats per numbered felt on the venue wall (and condense cap). */
export const VENUE_CONDENSE_MAX_SEATS = 8
export const VENUE_CONDENSE_MIN_SEATS = 2
/** Full table shuffle every N venue-wide End Rounds (after solo rescue). */
export const VENUE_SHUFFLE_EVERY_HANDS = 5

export function isChipSurvivor(p: Pick<PlayerState, 'bankroll'>): boolean {
  return typeof p.bankroll === 'number' && Number.isFinite(p.bankroll) && p.bankroll > 0
}

export function countChipSurvivors(players: readonly Pick<PlayerState, 'bankroll'>[]): number {
  return players.filter(isChipSurvivor).length
}

export function optimalVenueTableCount(survivorCount: number): number {
  if (survivorCount <= 0) return 1
  return computeOptimalTableCount(
    survivorCount,
    VENUE_CONDENSE_MAX_SEATS,
    VENUE_CONDENSE_MIN_SEATS,
  )
}

/** Table count after a full shuffle at `survivorCount`. */
export function mergeTargetTableCount(survivorCount: number): number {
  return Math.max(1, optimalVenueTableCount(survivorCount))
}

/** Hands remaining until the next scheduled table shuffle. */
export function handsUntilVenueShuffle(
  handsCompletedAtVenue: number,
  every: number = VENUE_SHUFFLE_EVERY_HANDS,
): number {
  const n = Math.max(0, Math.floor(handsCompletedAtVenue))
  const step = Math.max(1, Math.floor(every))
  const mod = n % step
  return mod === 0 ? step : step - mod
}

/** True when `handsCompletedAtVenue` is on a shuffle boundary (5, 10, 15, …). */
export function isVenueShuffleHand(
  handsCompletedAtVenue: number,
  every: number = VENUE_SHUFFLE_EVERY_HANDS,
): boolean {
  const n = Math.max(0, Math.floor(handsCompletedAtVenue))
  const step = Math.max(1, Math.floor(every))
  return n > 0 && n % step === 0
}

export type VenueTableRoster = {
  tableNum: number
  players: PlayerState[]
}

export type VenueCondenseMoveReason = 'solo'

export type VenueCondensePlayerMove = {
  playerId: string
  fromTableNum: number
  toTableNum: number
  reason: VenueCondenseMoveReason
}

/** @deprecated Use {@link VenueCondensePlayerMove} */
export type VenueCondenseSoloMove = Pick<
  VenueCondensePlayerMove,
  'playerId' | 'fromTableNum' | 'toTableNum'
>

export type VenueCondenseScheduledMerge = {
  targetTableCount: number
  sizes: number[]
  /** tableNum → ordered player ids after shotgun shuffle */
  assignments: Map<number, PlayerState[]>
}

export type VenueCondensePlan = {
  /** Solo rescue moves in apply order. */
  playerMoves: VenueCondensePlayerMove[]
  scheduledMerge: VenueCondenseScheduledMerge | null
}

function cloneTables(tables: VenueTableRoster[]): VenueTableRoster[] {
  return tables.map((t) => ({ tableNum: t.tableNum, players: [...t.players] }))
}

function liveTablesWithChipSurvivors(tables: VenueTableRoster[]): VenueTableRoster[] {
  return tables
    .map((t) => ({
      tableNum: t.tableNum,
      players: t.players.filter(isChipSurvivor),
    }))
    .filter((t) => t.players.length > 0)
}

function countSurvivorsAcross(tables: VenueTableRoster[]): number {
  return tables.reduce((n, t) => n + t.players.length, 0)
}

function tableSizesAfterMove(
  tables: VenueTableRoster[],
  fromTableNum: number,
  toTableNum: number,
): number[] {
  const from = tables.find((t) => t.tableNum === fromTableNum)
  const to = tables.find((t) => t.tableNum === toTableNum)
  if (from == null || to == null || from.players.length === 0) return tables.map((t) => t.players.length)

  const sizes: number[] = []
  for (const t of tables) {
    if (t.tableNum === fromTableNum) {
      const next = t.players.length - 1
      if (next > 0) sizes.push(next)
      continue
    }
    if (t.tableNum === toTableNum) {
      sizes.push(t.players.length + 1)
      continue
    }
    sizes.push(t.players.length)
  }
  return sizes
}

function wouldCreateSolo(
  tables: VenueTableRoster[],
  fromTableNum: number,
  toTableNum: number,
  options?: { ignoreFromTable?: boolean },
): boolean {
  for (const t of tables) {
    if (options?.ignoreFromTable && t.tableNum === fromTableNum) continue
    let size = t.players.length
    if (t.tableNum === fromTableNum) size -= 1
    if (t.tableNum === toTableNum) size += 1
    if (size === 1) return true
  }
  return false
}

function scoreMoveDestination(
  tables: VenueTableRoster[],
  fromTableNum: number,
  toTable: VenueTableRoster,
  maxSeats: number,
  options?: { ignoreFromTableSolo?: boolean },
): number {
  if (toTable.tableNum === fromTableNum) return -Infinity
  if (toTable.players.length >= maxSeats) return -Infinity

  const sizesAfter = tableSizesAfterMove(tables, fromTableNum, toTable.tableNum)
  if (sizesAfter.length === 0) return -Infinity
  if (sizesAfter.some((n) => n > maxSeats)) return -Infinity
  if (wouldCreateSolo(tables, fromTableNum, toTable.tableNum, { ignoreFromTable: options?.ignoreFromTableSolo })) {
    return -Infinity
  }

  const spread = Math.max(...sizesAfter) - Math.min(...sizesAfter)
  let score = 1000 - spread * 100

  const destSize = toTable.players.length
  if (destSize >= 2 && destSize <= 6) score += 40
  if (destSize === 0) score += 20

  score -= toTable.tableNum * 0.01
  return score
}

function pickBestDestination(
  tables: VenueTableRoster[],
  fromTableNum: number,
  maxSeats: number,
  options?: { allowSoloDest?: boolean; ignoreFromTableSolo?: boolean },
): VenueTableRoster | null {
  let best: VenueTableRoster | null = null
  let bestScore = -Infinity

  for (const candidate of tables) {
    if (candidate.tableNum === fromTableNum) continue
    if (!options?.allowSoloDest && candidate.players.length === 1) continue
    const score = scoreMoveDestination(tables, fromTableNum, candidate, maxSeats, {
      ignoreFromTableSolo: options?.ignoreFromTableSolo,
    })
    if (score > bestScore || (score === bestScore && best != null && candidate.tableNum < best.tableNum)) {
      bestScore = score
      best = candidate
    }
  }

  return bestScore > -Infinity ? best : null
}

function applyPlayerMove(tables: VenueTableRoster[], move: VenueCondensePlayerMove): VenueTableRoster[] {
  const next = cloneTables(tables)
  const fromIdx = next.findIndex((t) => t.tableNum === move.fromTableNum)
  const toIdx = next.findIndex((t) => t.tableNum === move.toTableNum)
  if (fromIdx < 0 || toIdx < 0) return liveTablesWithChipSurvivors(next)
  const pi = next[fromIdx]!.players.findIndex((p) => p.id === move.playerId)
  if (pi < 0) return liveTablesWithChipSurvivors(next)
  const [player] = next[fromIdx]!.players.splice(pi, 1)
  if (player) next[toIdx]!.players.push(player)
  return liveTablesWithChipSurvivors(next)
}

function pickSoloMove(tables: VenueTableRoster[], maxSeats: number): VenueCondensePlayerMove | null {
  const solos = tables.filter((t) => t.players.length === 1).sort((a, b) => a.tableNum - b.tableNum)
  if (solos.length === 0) return null
  if (tables.length === 1 && solos.length === 1) return null

  const from = solos[0]!
  const to = pickBestDestination(tables, from.tableNum, maxSeats, { allowSoloDest: false })
  if (to == null) {
    const fallback = pickBestDestination(tables, from.tableNum, maxSeats, { allowSoloDest: true })
    if (fallback == null) return null
    return {
      playerId: from.players[0]!.id,
      fromTableNum: from.tableNum,
      toTableNum: fallback.tableNum,
      reason: 'solo',
    }
  }

  return {
    playerId: from.players[0]!.id,
    fromTableNum: from.tableNum,
    toTableNum: to.tableNum,
    reason: 'solo',
  }
}

function buildScheduledMerge(
  tables: VenueTableRoster[],
  rng: () => number,
): VenueCondenseScheduledMerge {
  const survivors = tables.flatMap((t) => t.players)
  const n = survivors.length
  const targetTableCount = mergeTargetTableCount(n)
  const sizes = splitIntoTableSizes(n, targetTableCount)
  const shuffled = shuffleWithRng(survivors, rng)
  const assignments = new Map<number, PlayerState[]>()
  let offset = 0
  for (let i = 0; i < targetTableCount; i++) {
    const tableNum = i + 1
    const size = sizes[i] ?? 0
    assignments.set(tableNum, shuffled.slice(offset, offset + size))
    offset += size
  }
  return { targetTableCount, sizes, assignments }
}

/**
 * Plan venue seating after End Round: solo rescue, then optional scheduled full shuffle.
 */
export function planVenueCondense(
  tablesIn: VenueTableRoster[],
  options?: { maxSeats?: number; rng?: () => number; shuffle?: boolean },
): VenueCondensePlan {
  const maxSeats = options?.maxSeats ?? VENUE_CONDENSE_MAX_SEATS
  const rng = options?.rng ?? Math.random

  const playerMoves: VenueCondensePlayerMove[] = []
  let tables = liveTablesWithChipSurvivors(tablesIn)

  for (let guard = 0; guard < 64; guard++) {
    const move = pickSoloMove(tables, maxSeats)
    if (!move) break
    playerMoves.push(move)
    tables = applyPlayerMove(tables, move)
  }

  const survivorCount = countSurvivorsAcross(tables)
  const scheduledMerge =
    options?.shuffle === true && tables.length > 1 && survivorCount > 0
      ? buildScheduledMerge(tables, rng)
      : null

  return { playerMoves, scheduledMerge }
}

/** Audience copy inputs for the scheduled shuffle countdown. */
export function venueShuffleDisplayFields(args: {
  handsCompletedAtVenue: number
  liveTableCount: number
  every?: number
}): {
  handsUntilShuffle: number | null
  shuffleEveryHands: number
} {
  const shuffleEveryHands = Math.max(1, Math.floor(args.every ?? VENUE_SHUFFLE_EVERY_HANDS))
  if (args.liveTableCount <= 1) {
    return { handsUntilShuffle: null, shuffleEveryHands }
  }
  return {
    handsUntilShuffle: handsUntilVenueShuffle(args.handsCompletedAtVenue, shuffleEveryHands),
    shuffleEveryHands,
  }
}
