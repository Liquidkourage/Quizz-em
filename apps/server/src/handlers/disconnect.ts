import type { Socket } from 'socket.io'
import type { GameState } from '@qhe/core'
import * as g from '../game-ops'

export function handleDisconnect(socket: Socket) {
    console.log('Client disconnected:', socket.id)

    g.clearDisplayPairingForSocket(socket.id)
    g.detachDisplaySocket(socket.id)
    const playerId = g.unregisterPlayerSocket(socket.id)
    if (playerId) {
      const venueCode =
        typeof (socket.data as { venueCode?: string }).venueCode === 'string'
          ? (socket.data as { venueCode: string }).venueCode
          : null
      const hit = venueCode
        ? g.findPlayerSessionInVenue(venueCode, playerId)
        : null
      if (hit) g.emitTablePresence(hit.sessionKey)
      else {
        for (const [tk, gs] of g.rooms) {
          if ((gs as GameState).players?.some((p) => p.id === playerId)) {
            g.emitTablePresence(tk)
            break
          }
        }
      }
    }
}
