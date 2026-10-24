import type { Socket } from 'socket.io'
import type { GameState } from '@qhe/core'
import * as g from '../game-ops'
import { handleDisplayTransport } from './display-actions'
import { handleLibraryAction } from './library-actions'
import { handleShowAction } from './show-actions'
import { handleWageringAction } from './wagering-actions'

export async function dispatchAction(socket: Socket, data: { type?: string; payload?: any }) {
  const type = typeof data?.type === 'string' ? data.type : ''
  const payload = data?.payload

  if (await handleDisplayTransport(socket, type, payload)) return

  const sessionKey = g.getActiveSessionKey(socket)
  if (!sessionKey) {
    socket.emit('toast', 'No room found')
    return
  }

  let gameState = g.rooms.get(sessionKey)
  if (!gameState) {
    socket.emit('toast', 'Game not found')
    return
  }

  try {
    const lib = await handleLibraryAction(socket, type, payload, sessionKey, gameState)
    const wag =
      lib ?? (await handleWageringAction(socket, type, payload, sessionKey, gameState))
    const show =
      wag ?? (await handleShowAction(socket, type, payload, sessionKey, gameState))
    if (!show) {
      socket.emit('toast', 'Unknown action')
      return
    }
    gameState = show

    if (!g.VENUE_SYNC_ACTION_TYPES.has(type)) {
      const beforeMoves = g.rooms.get(sessionKey) as GameState
      gameState = g.runVirtualPlayerSimulation(gameState)
      g.commitTableAdvance(sessionKey, beforeMoves, gameState)
      if (type === 'submitAnswer' && gameState.phase === 'answering') {
        g.emitDisplayVenueSnapshotNow(gameState.code)
      }
    }
  } catch (error) {
    console.error('Action error:', error)
    socket.emit('toast', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
