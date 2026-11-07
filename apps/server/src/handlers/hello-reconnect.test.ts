import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import * as gameOps from '../game-ops'
import { rooms, tableSessionKey } from '../game-ops'
import { handleDisconnect } from './disconnect'
import { handleHello } from './hello'

beforeEach(() => {
  rooms.clear()
})
afterEach(() => {
  rooms.clear()
  vi.restoreAllMocks()
})

describe('handleHello reconnect', () => {
  it('returns a dropped phone to the same seat without adding a second player', async () => {
    const key = tableSessionKey('BACK', '1')
    rooms.set(key, addPlayer(createEmptyGame('BACK', 'host', '1'), 'human:ada', 'Ada L.', 800))
    gameOps.registerPlayerSocket('human:ada', 'sock-old')
    vi.spyOn(gameOps, 'emitTablePresence').mockImplementation(() => {})
    vi.spyOn(gameOps, 'emitVenueTableState').mockImplementation(() => {})
    vi.spyOn(gameOps, 'emitPlayerVenueBriefNow').mockImplementation(() => {})

    handleDisconnect({ id: 'sock-old', data: { venueCode: 'BACK' } } as never)

    expect(rooms.get(key)?.players).toHaveLength(1)

    const events: { event: string; data: unknown }[] = []
    const socket = {
      id: 'sock-new',
      data: {} as { venueCode?: string; sessionKey?: string; role?: string },
      rooms: new Set<string>(),
      join(room: string) {
        this.rooms.add(room)
      },
      leave() {},
      emit(event: string, data: unknown) {
        events.push({ event, data })
      },
      disconnect() {},
    }

    await handleHello(socket as never, {
      role: 'player',
      name: 'Ada L.',
      roomCode: 'BACK',
      tableId: 'LOBBY',
      playerId: 'human:ada',
    })

    const ack = events.find((row) => row.event === 'ack')?.data as {
      ok?: boolean
      restoredTableId?: string
      playerId?: string
    }
    expect(ack.ok).toBe(true)
    expect(ack.restoredTableId).toBe('1')
    expect(ack.playerId).toBe('human:ada')
    expect(rooms.get(key)?.players.map((player) => player.id)).toEqual(['human:ada'])
    expect(socket.rooms.has(key)).toBe(true)
  })
})
