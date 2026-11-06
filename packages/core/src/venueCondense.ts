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
  /** Index into chip-survivor `players` who posts the next big blind. */
  nextBigBlindIndex?: number
}

export type VenueCondenseMoveReason = 'balance' | 'reduction' | 'winner'

export function seatingMoveByline(reason: VenueCondenseMoveReason): string {
  if (reason === 'reduction') return 'TABLE REDUCTION'
  if (reason === 'winner') return 'TABLE WINNER'
  return 'TABLE BALANCE'
}

/** Chip-survivor index of the player who posts the next big blind. */
export function nextBigBlindChipIndex(players: readonly PlayerState[], dealerIndex: number): number {
  const chips = players.filter(isChipSurvivor)
  if (chips.length === 0 || players.length === 0) return 0
  const nextChip = (fromExclusive: number): number => {
    for (let step = 1; step <= players.length; step++) {
      const idx = (((fromExclusive + step) % players.length) + players.length) % players.length
      if (isChipSurvivor(players[idx]!)) return idx
    }
    return -1
  }
  const smallBlind = nextChip(dealerIndex)
  const bigBlind = chips.length <= 1 ? smallBlind : nextChip(smallBlind)
  const id = bigBlind >= 0 ? players[bigBlind]?.id : undefined
  const at = chips.findIndex((player) => player.id === id)
  return at < 0 ? 0 : at
}

export type VenueCondensePlayerMove = {
  playerId: string
  fromTableNum: number
  toTableNum: number
  reason: VenueCondenseMoveReason
  byline: string
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
  return tables.map((t) => ({
    tableNum: t.tableNum,
    players: [...t.players],
    nextBigBlindIndex: t.nextBigBlindIndex,
  }))
}

function liveTablesWithChipSurvivors(tables: VenueTableRoster[]): VenueTableRoster[] {
  return tables
    .map((t) => {
      const players = t.players.filter(isChipSurvivor)
      return {
        tableNum: t.tableNum,
        players,
        nextBigBlindIndex: players.length === t.players.length ? t.nextBigBlindIndex : 0,
      }
    })
    .filter((t) => t.players.length > 0)
}

function countSurvivorsAcross(tables: VenueTableRoster[]): number {
  return tables.reduce((n, t) => n + t.players.length, 0)
}

function bigBlindIndex(table: VenueTableRoster): number {
  const n = table.players.length
  if (n === 0) return 0
  const raw = table.nextBigBlindIndex ?? 0
  return ((raw % n) + n) % n
}

function noteBigBlindRemoved(table: VenueTableRoster, removedIndex: number): void {
  const before = table.players.length + 1
  const bb = ((table.nextBigBlindIndex ?? 0) % before + before) % before
  if (table.players.length === 0) {
    table.nextBigBlindIndex = 0
    return
  }
  if (removedIndex < bb) table.nextBigBlindIndex = bb - 1
  else if (removedIndex === bb) table.nextBigBlindIndex = bb % table.players.length
  else table.nextBigBlindIndex = bb
}

function largestTable(tables: VenueTableRoster[]): VenueTableRoster {
  return tables.reduce((best, table) =>
    table.players.length > best.players.length ||
    (table.players.length === best.players.length && table.tableNum < best.tableNum)
      ? table
      : best,
  )
}

function shortestOther(tables: VenueTableRoster[], fromTableNum: number, maxSeats: number): VenueTableRoster | null {
  let best: VenueTableRoster | null = null
  for (const table of tables) {
    if (table.tableNum === fromTableNum || table.players.length >= maxSeats) continue
    if (
      best == null ||
      table.players.length < best.players.length ||
      (table.players.length === best.players.length && table.tableNum < best.tableNum)
    ) {
      best = table
    }
  }
  return best
}

function tableToBreak(tables: VenueTableRoster[]): VenueTableRoster | null {
  if (tables.length <= 1) return null
  if (tables.length <= mergeTargetTableCount(countSurvivorsAcross(tables))) return null
  return tables.reduce((best, table) =>
    table.players.length < best.players.length ||
    (table.players.length === best.players.length && table.tableNum > best.tableNum)
      ? table
      : best,
  )
}

function seatChange(
  from: VenueTableRoster,
  to: VenueTableRoster,
  player: PlayerState,
  reason: VenueCondenseMoveReason,
): VenueCondensePlayerMove {
  return {
    playerId: player.id,
    fromTableNum: from.tableNum,
    toTableNum: to.tableNum,
    reason,
    byline: seatingMoveByline(reason),
  }
}

function tablesAreShort(tables: VenueTableRoster[]): boolean {
  return tables.length > 0 && tables.every((table) => table.players.length < 3)
}

function pickBreakMove(tables: VenueTableRoster[], maxSeats: number, lockedFrom?: number): VenueCondensePlayerMove | null {
  if (tablesAreShort(tables)) return null
  const from =
    lockedFrom != null ? tables.find((table) => table.tableNum === lockedFrom) ?? null : tableToBreak(tables)
  if (from == null || from.players.length === 0) return null
  const to = shortestOther(tables, from.tableNum, maxSeats)
  const player = from.players[0]
  if (to == null || player == null) return null
  return seatChange(from, to, player, 'reduction')
}

function pickBalanceMove(tables: VenueTableRoster[], maxSeats: number): VenueCondensePlayerMove | null {
  if (tables.length < 2) return null
  const big = largestTable(tables)
  const small = shortestOther(tables, big.tableNum, maxSeats)
  if (small == null) return null
  const gap = big.players.length - small.players.length
  if (gap < 2) return null
  const player = big.players[bigBlindIndex(big)]
  if (player == null) return null
  return {
    playerId: player.id,
    fromTableNum: big.tableNum,
    toTableNum: small.tableNum,
    reason: 'balance',
    byline: seatingMoveByline('balance'),
  }
}

function pickDeadTableMove(tables: VenueTableRoster[], maxSeats: number): VenueCondensePlayerMove | null {
  if (tables.length < 2) return null
  if (Math.max(...tables.map((table) => table.players.length)) >= 3) return null
  const from = tables
    .filter((table) => table.players.length === 1)
    .sort((a, b) => b.tableNum - a.tableNum)[0]
  if (from == null) return null
  const to = shortestOther(tables, from.tableNum, maxSeats)
  const player = from.players[0]
  if (to == null || player == null) return null
  return seatChange(from, to, player, 'winner')
}

function applyPlayerMove(tables: VenueTableRoster[], move: VenueCondensePlayerMove): VenueTableRoster[] {
  const next = cloneTables(tables)
  const fromIdx = next.findIndex((t) => t.tableNum === move.fromTableNum)
  const toIdx = next.findIndex((t) => t.tableNum === move.toTableNum)
  if (fromIdx < 0 || toIdx < 0) return liveTablesWithChipSurvivors(next)
  const pi = next[fromIdx]!.players.findIndex((p) => p.id === move.playerId)
  if (pi < 0) return liveTablesWithChipSurvivors(next)
  const [player] = next[fromIdx]!.players.splice(pi, 1)
  noteBigBlindRemoved(next[fromIdx]!, pi)
  if (player) next[toIdx]!.players.push(player)
  return liveTablesWithChipSurvivors(next)
}

/**
 * Live tables after a break, packed to 1..n in their current order.
 * Table 1, 3, 4, 5 becomes 1, 2, 3, 4.
 */
export function compactTableNumbers(tableNums: readonly number[]): Map<number, number> {
  const sorted = [...new Set(tableNums.filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b)
  const map = new Map<number, number>()
  sorted.forEach((n, i) => map.set(n, i + 1))
  return map
}

function chipStack(player: PlayerState): number {
  const stack = player.bankroll
  return typeof stack === 'number' && Number.isFinite(stack) ? stack : 0
}

function rankByStack(players: PlayerState[], rng: () => number): PlayerState[] {
  return shuffleWithRng(players, rng).sort((a, b) => chipStack(b) - chipStack(a))
}

function openSeatOrder(seatLeft: readonly number[], order: readonly number[], forward: boolean): number[] {
  const open = order.filter((index) => (seatLeft[index] ?? 0) > 0)
  return forward ? open : open.reverse()
}

function dealRankChunk(
  tables: PlayerState[][],
  seatLeft: number[],
  sweep: readonly number[],
  ranked: readonly PlayerState[],
  cursor: number,
  rng: () => number,
): number {
  const chunk = shuffleWithRng(ranked.slice(cursor, cursor + sweep.length), rng)
  sweep.forEach((tableIndex, offset) => {
    const player = chunk[offset]
    if (player == null) return
    tables[tableIndex]!.push(player)
    seatLeft[tableIndex] = (seatLeft[tableIndex] ?? 0) - 1
  })
  return cursor + chunk.length
}

/**
 * One player from each stack band per table, bands dealt in a snake.
 * Seat order inside a table is shuffled after the deal.
 */
function dealBalancedStacks(players: PlayerState[], sizes: readonly number[], rng: () => number): PlayerState[][] {
  const ranked = rankByStack(players, rng)
  const tables = sizes.map(() => [] as PlayerState[])
  const seatLeft = sizes.slice()
  const order = shuffleWithRng(sizes.map((_, index) => index), rng)
  let cursor = 0
  let forward = true
  while (cursor < ranked.length) {
    const sweep = openSeatOrder(seatLeft, order, forward)
    if (sweep.length === 0) break
    cursor = dealRankChunk(tables, seatLeft, sweep, ranked, cursor, rng)
    forward = !forward
  }
  return tables.map((table) => shuffleWithRng(table, rng))
}

function buildScheduledMerge(
  tables: VenueTableRoster[],
  rng: () => number,
): VenueCondenseScheduledMerge {
  const survivors = tables.flatMap((t) => t.players)
  const n = survivors.length
  const targetTableCount = mergeTargetTableCount(n)
  const sizes = splitIntoTableSizes(n, targetTableCount)
  const dealt = dealBalancedStacks(survivors, sizes, rng)
  const assignments = new Map<number, PlayerState[]>()
  dealt.forEach((players, index) => assignments.set(index + 1, players))
  return { targetTableCount, sizes, assignments }
}

function pushMove(
  moves: VenueCondensePlayerMove[],
  tables: VenueTableRoster[],
  move: VenueCondensePlayerMove,
): VenueTableRoster[] {
  moves.push(move)
  return applyPlayerMove(tables, move)
}

function drainMoves(
  tables: VenueTableRoster[],
  moves: VenueCondensePlayerMove[],
  pick: (tables: VenueTableRoster[]) => VenueCondensePlayerMove | null,
): VenueTableRoster[] {
  let next = tables
  for (let guard = 0; guard < 64; guard++) {
    const move = pick(next)
    if (!move) break
    next = pushMove(moves, next, move)
  }
  return next
}

function breakSpareTables(
  tables: VenueTableRoster[],
  moves: VenueCondensePlayerMove[],
  maxSeats: number,
): VenueTableRoster[] {
  let next = tables
  let breaking: number | undefined
  for (let guard = 0; guard < 64; guard++) {
    const move = pickBreakMove(next, maxSeats, breaking)
    if (!move) break
    breaking = move.fromTableNum
    next = pushMove(moves, next, move)
    if (!next.some((table) => table.tableNum === breaking)) breaking = undefined
  }
  return next
}

/**
 * Plan venue seating after End Round: break spare tables, balance the rest, then an optional full shuffle.
 */
export function planVenueCondense(
  tablesIn: VenueTableRoster[],
  options?: { maxSeats?: number; rng?: () => number; shuffle?: boolean },
): VenueCondensePlan {
  const maxSeats = options?.maxSeats ?? VENUE_CONDENSE_MAX_SEATS
  const rng = options?.rng ?? Math.random
  const playerMoves: VenueCondensePlayerMove[] = []
  let tables = liveTablesWithChipSurvivors(tablesIn)
  tables = breakSpareTables(tables, playerMoves, maxSeats)
  tables = drainMoves(tables, playerMoves, (current) => pickBalanceMove(current, maxSeats))
  tables = drainMoves(tables, playerMoves, (current) => pickDeadTableMove(current, maxSeats))

  const survivorCount = countSurvivorsAcross(tables)
  const scheduledMerge =
    options?.shuffle === true && tables.length > 1 && survivorCount > 0
      ? buildScheduledMerge(tables, rng)
      : null

  return { playerMoves, scheduledMerge }
}

/**
 * Whether the hand that just finished should reshuffle.
 * `skipNext` consumes itself on the boundary and pushes the countdown a full cycle.
 */
export function resolveVenueShuffleTick(args: {
  handsCompletedAtVenue: number
  every?: number
  skipNext?: boolean
}): { shuffleThisRound: boolean; skipNext: boolean; handsUntilShuffle: number } {
  const shuffleEveryHands = Math.max(1, Math.floor(args.every ?? VENUE_SHUFFLE_EVERY_HANDS))
  const due = isVenueShuffleHand(args.handsCompletedAtVenue, shuffleEveryHands)
  const skipNext = args.skipNext === true
  return {
    shuffleThisRound: due && !skipNext,
    skipNext: due ? false : skipNext,
    handsUntilShuffle: handsUntilVenueShuffle(args.handsCompletedAtVenue, shuffleEveryHands),
  }
}

/** Audience copy inputs for the scheduled shuffle countdown. */
export function venueShuffleDisplayFields(args: {
  handsCompletedAtVenue: number
  liveTableCount: number
  every?: number
  /** When set, the upcoming boundary is postponed by one full cycle. */
  skipNext?: boolean
}): {
  handsUntilShuffle: number | null
  shuffleEveryHands: number
} {
  const shuffleEveryHands = Math.max(1, Math.floor(args.every ?? VENUE_SHUFFLE_EVERY_HANDS))
  return { handsUntilShuffle: null, shuffleEveryHands }
}
