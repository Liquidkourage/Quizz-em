import type { Server as SocketIOServer } from 'socket.io'
import {
  type GameState,
  VENUE_NUMBERED_TABLE_MAX,
  countChipSurvivors,
  createEmptyGame,
  planVenueCondense,
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
  merged: boolean
  tablesBefore: number
  tablesAfter: number
  survivorsBefore: number
  survivorsAfter: number
  hostToasts: string[]
}

function collectRosters(deps: VenueCondenseApplyDeps): VenueTableRoster[] {
  const vn = deps.venueCode
  const out: VenueTableRoster[] = []
  for (const tk of deps.allTableSessionKeys(vn)) {
    const gs = deps.getState(tk)
    if (!gs || gs.players.length === 0) continue
    const n = deps.tableNumFromSessionKey(vn, tk)
    if (n == null) continue
    const survivors = gs.players.filter((p) => p.bankroll > 0)
    if (survivors.length === 0) continue
    out.push({ tableNum: n, players: survivors })
  }
  out.sort((a, b) => a.tableNum - b.tableNum)
  return out
}

function playerSessionKey(
  deps: VenueCondenseApplyDeps,
  rosters: VenueTableRoster[],
  playerId: string,
): string | null {
  const vn = deps.venueCode
  for (const t of rosters) {
    if (t.players.some((p) => p.id === playerId)) {
      return deps.tableSessionKey(vn, String(t.tableNum))
    }
  }
  return null
}

function applySoloMoveToRooms(
  deps: VenueCondenseApplyDeps,
  rosters: VenueTableRoster[],
  move: { playerId: string; fromTableNum: number; toTableNum: number },
): void {
  const vn = deps.venueCode
  const fromKey = deps.tableSessionKey(vn, String(move.fromTableNum))
  const toKey = deps.tableSessionKey(vn, String(move.toTableNum))
  const fromGs = deps.getState(fromKey)
  let toGs = deps.getState(toKey)
  if (!fromGs) return
  if (!toGs) {
    toGs = createEmptyGame(vn, fromGs.hostId, String(move.toTableNum))
  }
  const pi = fromGs.players.findIndex((p) => p.id === move.playerId)
  if (pi < 0) return
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
}

function applyScheduledMerge(deps: VenueCondenseApplyDeps, rosters: VenueTableRoster[]): void {
  const vn = deps.venueCode
  const merge = planVenueCondense(rosters).scheduledMerge
  if (!merge) return

  const sampleGs = deps.getState(deps.tableSessionKey(vn, String(rosters[0]!.tableNum)))
  const hostId = sampleGs?.hostId ?? deps.hostId
  const smallBlind = sampleGs?.smallBlind ?? 10
  const bigBlind = sampleGs?.bigBlind ?? 20

  const playerOldKey = new Map<string, string>()
  for (const t of rosters) {
    const tk = deps.tableSessionKey(vn, String(t.tableNum))
    for (const p of t.players) {
      playerOldKey.set(p.id, tk)
    }
  }

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

export function applyVenueCondenseAfterRound(deps: VenueCondenseApplyDeps): VenueCondenseApplyResult {
  const hostToasts: string[] = []
  let rosters = collectRosters(deps)
  const tablesBefore = rosters.length
  const survivorsBefore = rosters.reduce((n, t) => n + t.players.length, 0)

  const plan0 = planVenueCondense(rosters)
  for (const move of plan0.soloMoves) {
    applySoloMoveToRooms(deps, rosters, move)
    hostToasts.push(
      `Table ${move.fromTableNum} closed — player rescued to Table ${move.toTableNum}.`,
    )
    rosters = collectRosters(deps)
  }

  rosters = collectRosters(deps)
  const plan1 = planVenueCondense(rosters)
  let merged = false
  if (plan1.scheduledMerge) {
    const from = rosters.length
    const to = plan1.scheduledMerge.targetTableCount
    applyScheduledMerge(deps, rosters)
    merged = true
    hostToasts.push(`Tables combined — ${from} → ${to} (${survivorsBefore} players remaining).`)
  }

  rosters = collectRosters(deps)
  return {
    soloRescues: plan0.soloMoves.length,
    merged,
    tablesBefore,
    tablesAfter: rosters.length,
    survivorsBefore,
    survivorsAfter: rosters.reduce((n, t) => n + t.players.length, 0),
    hostToasts,
  }
}

export function venueCondenseSnapshotFromRooms(deps: {
  venueCode: string
  getState: (sessionKey: string) => GameState | undefined
  tableNumFromSessionKey: (venueCode: string, sessionKey: string) => number | null
  allTableSessionKeys: (venueCode: string) => string[]
}): {
  chipSurvivorCount: number
  liveTableCount: number
} {
  const rosters = collectRosters(deps as VenueCondenseApplyDeps)
  const chipSurvivorCount = rosters.reduce((n, t) => n + countChipSurvivors(t.players), 0)
  return { chipSurvivorCount, liveTableCount: rosters.length }
}
