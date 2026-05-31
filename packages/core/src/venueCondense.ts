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

export type VenueTableRoster = {
  tableNum: number
  players: PlayerState[]
}

export type VenueCondenseSoloMove = {
  playerId: string
  fromTableNum: number
  toTableNum: number
}

export type VenueCondenseScheduledMerge = {
  targetTableCount: number
  sizes: number[]
  /** tableNum → ordered player ids after shotgun shuffle */
  assignments: Map<number, PlayerState[]>
}

export type VenueCondensePlan = {
  soloMoves: VenueCondenseSoloMove[]
  scheduledMerge: VenueCondenseScheduledMerge | null
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

function pickSoloMove(
  tables: VenueTableRoster[],
  maxSeats: number,
  rng: () => number,
): VenueCondenseSoloMove | null {
  const solo = tables.filter((t) => t.players.length === 1)
  if (solo.length === 0) return null
  if (tables.length === 1 && solo.length === 1) return null

  const from = solo[Math.floor(rng() * solo.length)]!
  const destCandidates = tables.filter(
    (t) =>
      t.tableNum !== from.tableNum &&
      t.players.length >= 2 &&
      t.players.length < maxSeats,
  )
  if (destCandidates.length === 0) {
    const anyDest = tables.filter(
      (t) => t.tableNum !== from.tableNum && t.players.length < maxSeats,
    )
    if (anyDest.length === 0) return null
    const to = anyDest[Math.floor(rng() * anyDest.length)]!
    return { playerId: from.players[0]!.id, fromTableNum: from.tableNum, toTableNum: to.tableNum }
  }
  const to = destCandidates[Math.floor(rng() * destCandidates.length)]!
  return { playerId: from.players[0]!.id, fromTableNum: from.tableNum, toTableNum: to.tableNum }
}

function applySoloMove(tables: VenueTableRoster[], move: VenueCondenseSoloMove): VenueTableRoster[] {
  const next = tables.map((t) => ({ tableNum: t.tableNum, players: [...t.players] }))
  const fromIdx = next.findIndex((t) => t.tableNum === move.fromTableNum)
  const toIdx = next.findIndex((t) => t.tableNum === move.toTableNum)
  if (fromIdx < 0 || toIdx < 0) return next
  const pi = next[fromIdx]!.players.findIndex((p) => p.id === move.playerId)
  if (pi < 0) return next
  const [player] = next[fromIdx]!.players.splice(pi, 1)
  if (player) next[toIdx]!.players.push(player)
  return liveTablesWithChipSurvivors(next)
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
 * Plan solo-table rescues (repeat until none) then an optional scheduled shotgun merge.
 */
export function planVenueCondense(
  tablesIn: VenueTableRoster[],
  options?: { maxSeats?: number; rng?: () => number },
): VenueCondensePlan {
  const maxSeats = options?.maxSeats ?? VENUE_CONDENSE_MAX_SEATS
  const rng = options?.rng ?? Math.random

  const soloMoves: VenueCondenseSoloMove[] = []
  let tables = liveTablesWithChipSurvivors(tablesIn)

  for (let guard = 0; guard < 64; guard++) {
    const move = pickSoloMove(tables, maxSeats, rng)
    if (!move) break
    soloMoves.push(move)
    tables = applySoloMove(tables, move)
  }

  const liveCount = tables.length
  const survivorCount = countSurvivorsAcross(tables)
  const scheduledMerge = shouldScheduleVenueMerge(liveCount, survivorCount)
    ? buildScheduledMerge(tables, rng)
    : null

  return { soloMoves, scheduledMerge }
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
