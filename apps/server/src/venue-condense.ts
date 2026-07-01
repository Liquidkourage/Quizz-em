import type { DisplayVenueSeatingAnnouncement } from '@qhe/net'
import type { Server as SocketIOServer } from 'socket.io'
import {
  type GameState,
  VENUE_NUMBERED_TABLE_MAX,
  createEmptyGame,
  planVenueCondense,
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
  seatingMoves: { name: string; fromTableNum: number; toTableNum: number }[]
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
    /** After endRound busts are removed; chip filter skips empty felts at apply time. */
    const survivors = gs.players.filter((p) => p.bankroll > 0)
    if (survivors.length === 0) continue
    out.push({ tableNum: n, players: survivors })
  }
  out.sort((a, b) => a.tableNum - b.tableNum)
  return out
}

/** Audience display: seated headcount across numbered tables. */
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
    liveTableCount++
    chipSurvivorCount += gs.players.length
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
    `Table ${move.fromTableNum} closed — ${player.name} moved to Table ${move.toTableNum}.`,
  )
  return { name: player.name.trim() || move.playerId }
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

export function applyVenueCondenseAfterRound(
  deps: VenueCondenseApplyDeps,
  options: { shuffle: boolean },
): VenueCondenseApplyResult {
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
    })
    hostToasts.push(
      `Table ${move.fromTableNum} closed — player rescued to Table ${move.toTableNum}.`,
    )
    rosters = collectRosters(deps)
  }

  let shuffled = false
  if (plan.scheduledMerge) {
    const from = rosters.length
    const to = plan.scheduledMerge.targetTableCount
    applyScheduledMerge(deps, plan.scheduledMerge)
    shuffled = true
    hostToasts.push(`Tables shuffled — ${from} → ${to} (${survivorsBefore} players remaining).`)
  }

  rosters = collectRosters(deps)
  const tablesAfterSet = new Set(rosters.map((t) => t.tableNum))
  const closedTableNums = [...tablesBeforeSet]
    .filter((n) => !tablesAfterSet.has(n))
    .sort((a, b) => a - b)

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
    })),
    closedTableNums: result.closedTableNums,
    shuffled: result.shuffled,
    tablesBefore: result.tablesBefore,
    tablesAfter: result.tablesAfter,
    playerCount: result.survivorsAfter,
  }
}
