import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import * as gameOps from './game-ops'
import { rooms, tableSessionKey, venueAudienceWelcomeExpired } from './game-ops'
import { handleHello } from './handlers/hello'
import { seatLatePointsOnlyPlayer } from './late-entry'

beforeEach(() => {
  rooms.clear()
  venueAudienceWelcomeExpired.clear()
})
afterEach(() => {
  rooms.clear()
  venueAudienceWelcomeExpired.clear()
  vi.restoreAllMocks()
})

function seatChip(venue: string, tableId: string, id: string, name: string) {
  const gs = addPlayer(createEmptyGame(venue, 'host', tableId), id, name, 500)
  rooms.set(tableSessionKey(venue, tableId), gs)
}

describe('seatLatePointsOnlyPlayer', () => {
  it('puts a new arrival on the chip player with the fewest followers', () => {
    seatChip('LATE', '1', 'ada', 'Ada')
    const table1 = rooms.get(tableSessionKey('LATE', '1'))!
    rooms.set(tableSessionKey('LATE', '1'), {
      ...table1,
      players: table1.players.concat({
        id: 'boo',
        name: 'Boo',
        bankroll: 0,
        hand: [],
        hasFolded: false,
        isAllIn: false,
        pointsOnly: true,
        ghostHostId: 'ada',
      }),
    })
    seatChip('LATE', '2', 'cam', 'Cam')

    const seated = seatLatePointsOnlyPlayer('LATE', 'human:neo', 'Neo')

    expect(seated.ok).toBe(true)
    if (!seated.ok) return
    expect(seated.tableId).toBe('2')
    const neo = rooms.get(seated.sessionKey)?.players.find((player) => player.id === 'human:neo')
    expect(neo?.pointsOnly).toBe(true)
    expect(neo?.bankroll).toBe(0)
    expect(neo?.ghostHostId).toBe('cam')
  })
})

describe('handleHello late join', () => {
  it('seats a new phone for points once the show has started', async () => {
    seatChip('LATE', '1', 'ada', 'Ada')
    venueAudienceWelcomeExpired.add('LATE')
    vi.spyOn(gameOps, 'emitVenueTableState').mockImplementation(() => {})
    vi.spyOn(gameOps, 'emitPlayerVenueBriefNow').mockImplementation(() => {})
    const events: { event: string; data: unknown }[] = []
    const socket = {
      data: {},
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
      name: 'Neo',
      roomCode: 'LATE',
      tableId: 'LOBBY',
      playerId: 'human:neo',
    })

    const ack = events.find((row) => row.event === 'ack')?.data as { ok?: boolean; message?: string }
    expect(ack.ok).toBe(true)
    const neo = rooms.get(tableSessionKey('LATE', '1'))?.players.find((player) => player.id === 'human:neo')
    expect(neo?.pointsOnly).toBe(true)
    expect(neo?.bankroll).toBe(0)
    expect(socket.rooms.has(tableSessionKey('LATE', '1'))).toBe(true)
  })
})
