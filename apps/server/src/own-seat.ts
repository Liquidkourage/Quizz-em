import type { Socket } from 'socket.io'
import type { GameState } from '@qhe/core'
import { playerIdForSocket } from './player-socket-registry'

/** True when the action was refused. Player wagering and guesses must come from that seat's socket. */
export function denyUnlessOwnSeat(socket: Socket, playerId: unknown): boolean {
  if (typeof playerId === 'string' && playerId.length > 0 && playerIdForSocket(socket.id) === playerId) {
    return false
  }
  socket.emit('toast', 'That action is for another seat.')
  socket.emit('ack', { ok: false, message: 'That action is for another seat.' })
  return true
}

/** Fold is a turn action. Other streets already no-op unless this seat is to act. */
export function foldIsLegalNow(gs: GameState, playerId: string): boolean {
  if (gs.phase !== 'betting' || gs.round.isBettingOpen !== true) return false
  const idx = gs.round.currentPlayerIndex
  return typeof idx === 'number' && idx >= 0 && gs.players[idx]?.id === playerId
}
