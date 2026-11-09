import { pickLateEntryHost, type PlayerState } from '@qhe/core'
import {
  normalizeVenueCode,
  publicNameForNewPlayer,
  rooms,
  venuePlayableSnapshots,
} from './game-ops'

export type LateEntrySeat =
  | { ok: true; sessionKey: string; tableId: string; ghostHostId: string }
  | { ok: false; message: string }

function pointsOnlySeat(id: string, name: string, ghostHostId: string): PlayerState {
  return {
    id,
    name,
    bankroll: 0,
    hand: [],
    hasFolded: false,
    isAllIn: false,
    answerPoints: 0,
    pointsOnly: true,
    ghostHostId,
  }
}

/** Seat a player who arrived after the show started. They play for points and follow a chip player. */
export function seatLatePointsOnlyPlayer(venueCode: string, playerId: string, name: string): LateEntrySeat {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, message: 'Enter a name to join.' }
  const vn = normalizeVenueCode(venueCode)
  const tables = venuePlayableSnapshots(vn)
    .filter((row) => Number.isFinite(row.n))
    .map((row) => ({ tableNum: row.n, sessionKey: row.tk, players: row.gs.players }))
  const ghostHostId = pickLateEntryHost(tables)
  if (!ghostHostId) {
    return { ok: false, message: 'The chip contest is over, so there is no table left to join.' }
  }
  const home = tables.find((table) => table.players.some((player) => player.id === ghostHostId))
  const gs = home ? rooms.get(home.sessionKey) : undefined
  if (!home || !gs) {
    return { ok: false, message: 'The chip contest is over, so there is no table left to join.' }
  }
  const publicName = publicNameForNewPlayer(vn, trimmed)
  rooms.set(home.sessionKey, { ...gs, players: gs.players.concat(pointsOnlySeat(playerId, publicName, ghostHostId)) })
  return { ok: true, sessionKey: home.sessionKey, tableId: String(home.tableNum), ghostHostId }
}
