import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame, type GameState } from '@qhe/core'
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

function seatChip(venue: string, tableId: string, id: string, name: string, bankroll = 500): void {
  rooms.set(tableSessionKey(venue, tableId), addPlayer(createEmptyGame(venue, 'host', tableId), id, name, bankroll))
}

function table(venue: string, tableId: string): GameState {
  return rooms.get(tableSessionKey(venue, tableId))!
}

function everyone(venue: string): string[] {
  return [...rooms.entries()]
    .filter(([key]) => key.startsWith(`${venue}:`))
    .flatMap(([, gs]) => gs.players.map((p) => p.id))
}

describe('seatLatePointsOnlyPlayer, turned away', () => {
  it('asks for a name when it is blank', () => {
    seatChip('EDGE', '1', 'ada', 'Ada')
    const result = seatLatePointsOnlyPlayer('EDGE', 'human:x', '   ')
    expect(result).toEqual({ ok: false, message: 'Enter a name to join.' })
    expect(everyone('EDGE')).toEqual(['ada'])
  })

  it('refuses a name already in the game at another table, ignoring case and spaces', () => {
    seatChip('EDGE', '1', 'ada', 'Ada')
    seatChip('EDGE', '2', 'cam', 'Cam')
    const result = seatLatePointsOnlyPlayer('EDGE', 'human:imposter', '  cAm ')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/already in the game/)
    expect(everyone('EDGE').sort()).toEqual(['ada', 'cam'])
  })

  it('says the contest is over when no chip player is left to follow', () => {
    seatChip('EDGE', '1', 'ada', 'Ada', 0)
    const result = seatLatePointsOnlyPlayer('EDGE', 'human:neo', 'Neo')
    expect(result).toEqual({ ok: false, message: 'The chip contest is over, so there is no table left to join.' })
    expect(everyone('EDGE')).toEqual(['ada'])
  })

  it('does not follow a player who is already points-only', () => {
    const gs = addPlayer(createEmptyGame('EDGE', 'host', '1'), 'ghost', 'Ghost', 0)
    rooms.set(tableSessionKey('EDGE', '1'), {
      ...gs,
      players: gs.players.map((p) => ({ ...p, pointsOnly: true })),
    })
    expect(seatLatePointsOnlyPlayer('EDGE', 'human:neo', 'Neo').ok).toBe(false)
  })

  it('has nothing to join when the venue has no tables', () => {
    expect(seatLatePointsOnlyPlayer('NOSUCH', 'human:neo', 'Neo').ok).toBe(false)
  })
})

describe('seatLatePointsOnlyPlayer, seated', () => {
  it('spreads several arrivals across the chip players, lowest table first', () => {
    seatChip('EDGE', '1', 'ada', 'Ada')
    seatChip('EDGE', '2', 'cam', 'Cam')
    const placed = ['Neo', 'Oli', 'Pam'].map((name) => {
      const result = seatLatePointsOnlyPlayer('EDGE', `human:${name.toLowerCase()}`, name)
      return result.ok ? result.tableId : 'refused'
    })
    expect(placed).toEqual(['1', '2', '1'])
  })

  it('adds only the newcomer: chips, pot and the hand in progress are untouched', () => {
    seatChip('EDGE', '1', 'ada', 'Ada', 700)
    const before = table('EDGE', '1')
    const inHand: GameState = {
      ...before,
      phase: 'betting',
      round: { ...before.round, pot: 120, isBettingOpen: true, currentBet: 40 },
    }
    rooms.set(tableSessionKey('EDGE', '1'), inHand)

    const result = seatLatePointsOnlyPlayer('EDGE', 'human:neo', 'Neo')

    expect(result.ok).toBe(true)
    const after = table('EDGE', '1')
    expect(after.phase).toBe('betting')
    expect(after.round).toEqual(inHand.round)
    expect(after.players).toHaveLength(2)
    expect(after.players.find((p) => p.id === 'ada')).toEqual(inHand.players[0])
    const neo = after.players.find((p) => p.id === 'human:neo')!
    expect(neo).toMatchObject({ bankroll: 0, pointsOnly: true, ghostHostId: 'ada', hasFolded: false })
  })
})

describe('handleHello late join, edges', () => {
  function phone() {
    const events: { event: string; data: any }[] = []
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
    return { socket, events }
  }

  const hello = (socket: unknown, name: string, playerId: string) =>
    handleHello(socket as never, { role: 'player', name, roomCode: 'EDGE', tableId: 'LOBBY', playerId })

  beforeEach(() => {
    seatChip('EDGE', '1', 'ada', 'Ada')
    venueAudienceWelcomeExpired.add('EDGE')
    vi.spyOn(gameOps, 'emitVenueTableState').mockImplementation(() => {})
    vi.spyOn(gameOps, 'emitPlayerVenueBriefNow').mockImplementation(() => {})
  })

  it('brings a late phone back to its own seat instead of seating it twice', async () => {
    const first = phone()
    await hello(first.socket, 'Neo', 'human:neo')
    expect(everyone('EDGE').filter((id) => id === 'human:neo')).toHaveLength(1)

    const again = phone()
    await hello(again.socket, 'Neo', 'human:neo')

    expect(everyone('EDGE').filter((id) => id === 'human:neo')).toHaveLength(1)
    const ack = again.events.find((row) => row.event === 'ack')?.data
    expect(ack.ok).toBe(true)
    expect(again.socket.rooms.has(tableSessionKey('EDGE', '1'))).toBe(true)
  })

  it('tells a latecomer when their name is taken and seats nobody', async () => {
    const { socket, events } = phone()
    await hello(socket, 'ADA', 'human:imposter')
    const ack = events.find((row) => row.event === 'ack')?.data
    expect(ack.ok).toBe(false)
    expect(ack.message).toMatch(/already in the game/)
    expect(everyone('EDGE')).toEqual(['ada'])
    expect(socket.rooms.size).toBe(0)
  })
})
