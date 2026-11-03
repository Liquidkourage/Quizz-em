import type { DisplayVenueSeatingAnnouncement } from '@qhe/net'
import type { Server as SocketIOServer } from 'socket.io'
import {
  type GameState,
  VENUE_NUMBERED_TABLE_MAX,
  createEmptyGame,
  mergePointsStandings,
  nextBigBlindChipIndex,
  compactTableNumbers,
  planVenueCondense,
  type PointsStanding,
  type VenueCondensePlayerMove,
  type VenueCondenseScheduledMerge,
  type VenueTableRoster,
} from '@qhe/core'

export type VenueCondenseApplyDeps = {
  venueCode: string
  getState: (sessionKey: string) => GameState | undefined
  setState: (sessionKey: string, gs: GameState) => void
  tableSessionKey: (venueCode: string, tableId: string) => string
  tableNumFromSessionKey: (venueCode: string, sessionKey: string) => number | null
  allTableSessionKeys: (venueCode: string) => string[]
  applyEffectiveBlinds: (gs: GameState, venueCode: string, sessionKey: string) => GameState
  emitTableState: (sessionKey: string, gs: GameState) => void
  moveHumanSocket: (playerId: string, toKey: string, tableId: string) => void
  io: SocketIOServer
  hostId: string
}

export type VenueCondenseApplyResult = {
  soloRescues: number
  shuffled: boolean
  tablesBefore: number
  tablesAfter: number
  survivorsBefore: number
  survivorsAfter: number
  hostToasts: string[]
  seatingMoves: {
    name: string
    fromTableNum: number
    toTableNum: number
    byline: string
    renumberedFromTableNum?: number
  }[]
  closedTableNums: number[]
}

function collectRosters(deps: VenueCondenseApplyDeps): VenueTableRoster[] {
  const vn = deps.venueCode
  const out: VenueTableRoster[] = []
  for (const tk of deps.allTableSessionKeys(vn)) {
    const gs = deps.getState(tk)
    if (!gs || gs.players.length === 0) continue
    const n = deps.tableNumFromSessionKey(vn, tk)
    if (n == null) continue
    /** Chip stacks decide table size. A player with no stack is already off the table after payout. */
    const survivors = gs.players.filter((p) => p.bankroll > 0)
    if (survivors.length === 0) continue
    out.push({
      tableNum: n,
      players: survivors,
      nextBigBlindIndex: nextBigBlindChipIndex(gs.players, gs.round.dealerIndex),
    })
  }
  out.sort((a, b) => a.tableNum - b.tableNum)
  return out
}

/** Still in the tournament this hand: chips behind, or chips already in the pot. */
export function playerStillInField(
  player: { bankroll: number; pointsOnly?: boolean },
  committed: number,
): boolean {
  if (player.pointsOnly === true) return false
  const stack = Number.isFinite(player.bankroll) ? player.bankroll : 0
  const inPot = Number.isFinite(committed) ? committed : 0
  return stack > 0 || inPot > 0
}

/** Audience display: players still in the tournament across numbered tables. */
export function venueCondenseSnapshotFromRooms(deps: {
  venueCode: string
  getState: (sessionKey: string) => GameState | undefined
  tableNumFromSessionKey: (venueCode: string, sessionKey: string) => number | null
  allTableSessionKeys: (venueCode: string) => string[]
}): {
  chipSurvivorCount: number
  liveTableCount: number
} {
  const vn = deps.venueCode
  let chipSurvivorCount = 0
  let liveTableCount = 0
  for (const tk of deps.allTableSessionKeys(vn)) {
    const gs = deps.getState(tk)
    if (!gs || gs.players.length === 0) continue
    const n = deps.tableNumFromSessionKey(vn, tk)
    if (n == null) continue
    const committed = gs.round.handContributions ?? {}
    const chips = gs.players.filter((p) => playerStillInField(p, committed[p.id] ?? 0)).length
    if (chips === 0) continue
    liveTableCount++
    chipSurvivorCount += chips
  }
  return { chipSurvivorCount, liveTableCount }
}

function applyPlayerMoveToRooms(
  deps: VenueCondenseApplyDeps,
  move: VenueCondensePlayerMove,
): { name: string } | null {
  const vn = deps.venueCode
  const fromKey = deps.tableSessionKey(vn, String(move.fromTableNum))
  const toKey = deps.tableSessionKey(vn, String(move.toTableNum))
  const fromGs = deps.getState(fromKey)
  let toGs = deps.getState(toKey)
  if (!fromGs) return null
  if (!toGs) {
    toGs = createEmptyGame(vn, fromGs.hostId, String(move.toTableNum))
  }
  const pi = fromGs.players.findIndex((p) => p.id === move.playerId)
  if (pi < 0) return null
  const player = fromGs.players[pi]!
  const nextFrom: GameState = { ...fromGs, players: fromGs.players.filter((_, i) => i !== pi) }
  const nextTo: GameState = { ...toGs, players: toGs.players.concat(player) }
  deps.setState(fromKey, nextFrom)
  deps.setState(toKey, deps.applyEffectiveBlinds(nextTo, vn, toKey))
  deps.emitTableState(fromKey, nextFrom)
  deps.emitTableState(toKey, deps.getState(toKey)!)
  if (!player.id.startsWith('vp:')) {
    deps.moveHumanSocket(player.id, toKey, String(move.toTableNum))
  }

  deps.io.to(toKey).emit(
    'toast',
    `${move.byline} — ${player.name} to Table ${move.toTableNum}.`,
  )
  return { name: player.name.trim() || move.playerId }
}

/** All-in this hand still has the seat. Points-only players do not. */
export function unsettledAllInPassengers<T extends { pointsOnly?: boolean; bankroll: number }>(
  players: readonly T[],
): T[] {
  return players.filter((p) => p.pointsOnly !== true && p.bankroll <= 0)
}

function seatUnsettledAllIn(
  assignments: Map<number, GameState['players']>,
  passengers: readonly GameState['players'][number][],
): void {
  const liveTableNums = [...assignments.keys()].sort((a, b) => a - b)
  if (liveTableNums.length === 0 || passengers.length === 0) return
  passengers.forEach((player, i) => {
    const tableNum = liveTableNums[i % liveTableNums.length]!
    const list = assignments.get(tableNum) ?? []
    if (list.some((p) => p.id === player.id)) return
    assignments.set(tableNum, list.concat(player))
  })
}

function applyScheduledMerge(
  deps: VenueCondenseApplyDeps,
  merge: VenueCondenseScheduledMerge,
): void {
  const vn = deps.venueCode
  const sampleKey = deps.tableSessionKey(vn, '1')
  const sampleGs = deps.getState(sampleKey)
  const hostId = sampleGs?.hostId ?? deps.hostId
  const smallBlind = sampleGs?.smallBlind ?? 10
  const bigBlind = sampleGs?.bigBlind ?? 20
  const passengers: GameState['players'] = []
  for (const tk of deps.allTableSessionKeys(vn)) {
    const gs = deps.getState(tk)
    if (!gs) continue
    passengers.push(...unsettledAllInPassengers(gs.players))
  }
  seatUnsettledAllIn(merge.assignments, passengers)

  for (let n = 1; n <= VENUE_NUMBERED_TABLE_MAX; n++) {
    const tk = deps.tableSessionKey(vn, String(n))
    const assigned = merge.assignments.get(n) ?? []
    let gs = deps.getState(tk)
    if (!gs) {
      gs = createEmptyGame(vn, hostId, String(n))
    }
    const freshRound = createEmptyGame(vn, hostId, String(n)).round
    const next = deps.applyEffectiveBlinds(
      {
        ...gs,
        hostId,
        smallBlind,
        bigBlind,
        phase: 'lobby',
        players: assigned,
        round: freshRound,
      },
      vn,
      tk,
    )
    deps.setState(tk, next)
    deps.emitTableState(tk, next)
  }

  for (let n = 1; n <= merge.targetTableCount; n++) {
    const tk = deps.tableSessionKey(vn, String(n))
    const assigned = merge.assignments.get(n) ?? []
    for (const p of assigned) {
      if (p.id.startsWith('vp:')) continue
      deps.moveHumanSocket(p.id, tk, String(n))
    }
  }
}

type PackedTableSnap = { oldNum: number; gs: GameState | undefined }

function snapshotLiveTables(deps: VenueCondenseApplyDeps, live: VenueTableRoster[]): PackedTableSnap[] {
  const vn = deps.venueCode
  return live.map((table) => {
    const key = deps.tableSessionKey(vn, String(table.tableNum))
    return { oldNum: table.tableNum, gs: deps.getState(key) }
  })
}

function writePackedTable(
  deps: VenueCondenseApplyDeps,
  snap: PackedTableSnap,
  nextNum: number,
  hostId: string,
): void {
  if (!snap.gs) return
  const vn = deps.venueCode
  const tk = deps.tableSessionKey(vn, String(nextNum))
  const shell = deps.getState(tk) ?? createEmptyGame(vn, hostId, String(nextNum))
  const next = deps.applyEffectiveBlinds(
    { ...snap.gs, tableId: String(nextNum), players: snap.gs.players },
    vn,
    tk,
  )
  deps.setState(tk, { ...shell, ...next, tableId: String(nextNum) })
  for (const player of snap.gs.players) {
    if (player.id.startsWith('vp:')) continue
    deps.moveHumanSocket(player.id, tk, String(nextNum))
  }
}

function clearPackedGaps(deps: VenueCondenseApplyDeps, snapshots: PackedTableSnap[], nextNums: Set<number>): void {
  const vn = deps.venueCode
  for (const snap of snapshots) {
    if (nextNums.has(snap.oldNum)) continue
    const tk = deps.tableSessionKey(vn, String(snap.oldNum))
    const gs = deps.getState(tk)
    if (!gs) continue
    deps.setState(tk, { ...gs, players: [] })
  }
}

function emitPackedTables(deps: VenueCondenseApplyDeps, snapshots: PackedTableSnap[], nextNums: Set<number>): void {
  const vn = deps.venueCode
  for (let n = 1; n <= VENUE_NUMBERED_TABLE_MAX; n++) {
    const touched = nextNums.has(n) || snapshots.some((snap) => snap.oldNum === n)
    if (!touched) continue
    const tk = deps.tableSessionKey(vn, String(n))
    const gs = deps.getState(tk)
    if (gs) deps.emitTableState(tk, gs)
  }
}

/** Keep the pre-pack table number when packing changes where a move lands. */
export function noteRenumberedSeatingMoves<T extends { toTableNum: number; renumberedFromTableNum?: number }>(
  moves: T[],
  packed: ReadonlyMap<number, number>,
): void {
  for (const move of moves) {
    const nextTable = packed.get(move.toTableNum)
    if (nextTable == null || nextTable === move.toTableNum) continue
    move.renumberedFromTableNum = move.toTableNum
    move.toTableNum = nextTable
  }
}

/**
 * After a table closes, pack the survivors into table 1..n so the floor
 * does not keep a missing number.
 */
export function compactVenueTableNumbers(deps: VenueCondenseApplyDeps): Map<number, number> {
  const live = collectRosters(deps)
  const map = compactTableNumbers(live.map((table) => table.tableNum))
  if (live.every((table) => map.get(table.tableNum) === table.tableNum)) return map

  const snapshots = snapshotLiveTables(deps, live)
  const hostId = snapshots.find((snap) => snap.gs)?.gs?.hostId ?? deps.hostId
  const nextNums = new Set(map.values())
  for (const snap of snapshots) {
    const nextNum = map.get(snap.oldNum)
    if (nextNum == null) continue
    writePackedTable(deps, snap, nextNum, hostId)
  }
  clearPackedGaps(deps, snapshots, nextNums)
  emitPackedTables(deps, snapshots, nextNums)
  return map
}

function readVenuePointsStandings(deps: VenueCondenseApplyDeps): PointsStanding[] {
  const vn = deps.venueCode
  const rows: PointsStanding[] = []
  for (let n = 1; n <= VENUE_NUMBERED_TABLE_MAX; n++) {
    const gs = deps.getState(deps.tableSessionKey(vn, String(n)))
    const standings = gs?.pointsStandings
    if (standings != null && standings.length > 0) rows.push(...standings)
  }
  return mergePointsStandings(undefined, rows)
}

function writeVenuePointsStandings(deps: VenueCondenseApplyDeps, carried: readonly PointsStanding[]): void {
  if (carried.length === 0) return
  const vn = deps.venueCode
  for (let n = 1; n <= VENUE_NUMBERED_TABLE_MAX; n++) {
    const tk = deps.tableSessionKey(vn, String(n))
    const gs = deps.getState(tk)
    if (!gs) continue
    deps.setState(tk, { ...gs, pointsStandings: mergePointsStandings(carried, gs.pointsStandings ?? []) })
  }
}

export function applyVenueCondenseAfterRound(
  deps: VenueCondenseApplyDeps,
  options: { shuffle: boolean },
): VenueCondenseApplyResult {
  const carriedStandings = readVenuePointsStandings(deps)
  const hostToasts: string[] = []
  let rosters = collectRosters(deps)
  const tablesBeforeSet = new Set(rosters.map((t) => t.tableNum))
  const tablesBefore = rosters.length
  const survivorsBefore = rosters.reduce((n, t) => n + t.players.length, 0)

  const plan = planVenueCondense(rosters, { shuffle: options.shuffle })
  let soloRescues = 0
  const seatingMoves: VenueCondenseApplyResult['seatingMoves'] = []

  for (const move of plan.playerMoves) {
    const applied = applyPlayerMoveToRooms(deps, move)
    if (applied == null) continue
    soloRescues++
    seatingMoves.push({
      name: applied.name,
      fromTableNum: move.fromTableNum,
      toTableNum: move.toTableNum,
      byline: move.byline,
    })
    if (!hostToasts.includes(move.byline)) hostToasts.push(move.byline)
    rosters = collectRosters(deps)
  }

  let shuffled = false
  if (plan.scheduledMerge) {
    const from = rosters.length
    const to = plan.scheduledMerge.targetTableCount
    applyScheduledMerge(deps, plan.scheduledMerge)
    shuffled = true
    hostToasts.push(`TABLE SHUFFLE — ${from} → ${to} (${survivorsBefore} players remaining).`)
  }

  rosters = collectRosters(deps)
  const tablesAfterSet = new Set(rosters.map((t) => t.tableNum))
  const closedTableNums = [...tablesBeforeSet]
    .filter((n) => !tablesAfterSet.has(n))
    .sort((a, b) => a - b)

  if (!shuffled) {
    noteRenumberedSeatingMoves(seatingMoves, compactVenueTableNumbers(deps))
  }

  writeVenuePointsStandings(deps, carriedStandings)

  return {
    soloRescues,
    shuffled,
    tablesBefore,
    tablesAfter: rosters.length,
    survivorsBefore,
    survivorsAfter: rosters.reduce((n, t) => n + t.players.length, 0),
    hostToasts,
    seatingMoves,
    closedTableNums,
  }
}

export function venueSeatingAnnouncementFromResult(
  result: VenueCondenseApplyResult,
): DisplayVenueSeatingAnnouncement | null {
  if (
    !result.shuffled &&
    result.seatingMoves.length === 0 &&
    result.closedTableNums.length === 0
  ) {
    return null
  }
  return {
    moves: result.seatingMoves.map((m) => ({
      name: m.name,
      fromTableNum: m.fromTableNum,
      toTableNum: m.toTableNum,
      byline: m.byline,
      ...(m.renumberedFromTableNum != null
        ? { renumberedFromTableNum: m.renumberedFromTableNum }
        : {}),
    })),
    closedTableNums: result.closedTableNums,
    shuffled: result.shuffled,
    tablesBefore: result.tablesBefore,
    tablesAfter: result.tablesAfter,
    playerCount: result.survivorsAfter,
  }
}
