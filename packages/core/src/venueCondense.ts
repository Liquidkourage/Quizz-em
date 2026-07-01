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
/** Scheduled merge when optimal table count is at least this many below live table count. */
export const VENUE_CONDENSE_MERGE_MIN_TABLE_DROP = 2
/** Sparse tables closed per End Round before considering shotgun. */
export const VENUE_SEATING_MAX_CLOSURES_PER_ROUND = 2

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

/** True when a scheduled shotgun merge should run (not solo rescue). */
export function shouldScheduleVenueMerge(liveTableCount: number, survivorCount: number): boolean {
  if (liveTableCount <= 1 || survivorCount <= 0) return false
  const target = optimalVenueTableCount(survivorCount)
  return target <= liveTableCount - VENUE_CONDENSE_MERGE_MIN_TABLE_DROP
}

/** Table count after a scheduled merge at `survivorCount`. */
export function mergeTargetTableCount(survivorCount: number): number {
  return Math.max(1, optimalVenueTableCount(survivorCount))
}

/**
 * Smallest survivor headcount that triggers the next scheduled merge (audience-facing threshold).
 * `null` when already at one table or no merge is scheduled before the field ends.
 */
export function computeNextCondenseAtSurvivors(
  liveTableCount: number,
  currentSurvivors: number,
): number | null {
  if (liveTableCount <= 1 || currentSurvivors <= 0) return null

  for (let s = currentSurvivors; s >= 1; s--) {
    if (shouldScheduleVenueMerge(liveTableCount, s)) return s
  }
  return null
}

export type VenueCondenseMilestone = {
  atSurvivors: number
  fromTables: number
  toTables: number
}

/**
 * Scheduled combine thresholds from `scanFromSurvivors` down to final table,
 * simulating each merge and the next threshold at the new table count.
 */
export function listVenueCondenseMilestones(
  liveTableCount: number,
  scanFromSurvivors: number,
): VenueCondenseMilestone[] {
  if (liveTableCount <= 1 || scanFromSurvivors <= 0) return []

  const out: VenueCondenseMilestone[] = []
  let tables = liveTableCount
  let scanFrom = scanFromSurvivors

  while (tables > 1 && scanFrom >= 1) {
    const at = computeNextCondenseAtSurvivors(tables, scanFrom)
    if (at == null) break

    const toTables = mergeTargetTableCount(at)
    const last = out[out.length - 1]
    if (last?.atSurvivors !== at || last?.fromTables !== tables) {
      out.push({ atSurvivors: at, fromTables: tables, toTables })
    }

    if (toTables >= tables) break
    tables = toTables
    scanFrom = at - 1
  }

  return out
}

export type VenueTableRoster = {
  tableNum: number
  players: PlayerState[]
}

export type VenueCondenseMoveReason = 'solo' | 'rebalance' | 'closure'

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
  /** Incremental moves in apply order (solo → closure). */
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

function pickTableToClose(tables: VenueTableRoster[], idealTables: number): VenueTableRoster | null {
  if (tables.length <= idealTables) return null
  return [...tables].sort((a, b) => {
    const diff = a.players.length - b.players.length
    return diff !== 0 ? diff : a.tableNum - b.tableNum
  })[0]!
}

function planClosureMoves(tables: VenueTableRoster[], maxSeats: number): VenueCondensePlayerMove[] {
  const moves: VenueCondensePlayerMove[] = []
  let state = cloneTables(tables)

  for (let closed = 0; closed < VENUE_SEATING_MAX_CLOSURES_PER_ROUND; closed++) {
    const ideal = optimalVenueTableCount(countSurvivorsAcross(state))
    const target = pickTableToClose(state, ideal)
    if (target == null) break

    const playersToMove = [...target.players]
    for (const player of playersToMove) {
      const dest = pickBestDestination(state, target.tableNum, maxSeats, {
        allowSoloDest: true,
        ignoreFromTableSolo: true,
      })
      if (dest == null) break
      moves.push({
        playerId: player.id,
        fromTableNum: target.tableNum,
        toTableNum: dest.tableNum,
        reason: 'closure',
      })
      state = applyPlayerMove(state, moves[moves.length - 1]!)
    }
  }

  return moves
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
 * Plan sticky seating: solo rescue → table closure → shotgun fallback.
 * Uneven table sizes at the correct table count are tolerated until closure or merge.
 */
export function planVenueCondense(
  tablesIn: VenueTableRoster[],
  options?: { maxSeats?: number; rng?: () => number },
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

  const closureMoves = planClosureMoves(tables, maxSeats)
  for (const move of closureMoves) {
    playerMoves.push(move)
    tables = applyPlayerMove(tables, move)
  }

  const liveCount = tables.length
  const survivorCount = countSurvivorsAcross(tables)
  const scheduledMerge = shouldScheduleVenueMerge(liveCount, survivorCount)
    ? buildScheduledMerge(tables, rng)
    : null

  return { playerMoves, scheduledMerge }
}

/** Audience copy inputs derived from current venue rosters. */
export function venueCondenseDisplayFields(args: {
  liveTableCount: number
  chipSurvivorCount: number
}): {
  nextCondenseAtSurvivors: number | null
  targetTablesAfterCondense: number | null
} {
  const { liveTableCount, chipSurvivorCount } = args
  const nextCondenseAtSurvivors = computeNextCondenseAtSurvivors(liveTableCount, chipSurvivorCount)
  const targetTablesAfterCondense =
    nextCondenseAtSurvivors != null
      ? mergeTargetTableCount(nextCondenseAtSurvivors)
      : null
  return { nextCondenseAtSurvivors, targetTablesAfterCondense }
}
