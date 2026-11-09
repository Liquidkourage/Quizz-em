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

describe('seatLatePointsOnlyPlayer, turned away', () => {
  it('asks for a name when it is blank', () => {
    seatChip('EDGE', '1', 'ada', 'Ada')
    const result = seatLatePointsOnlyPlayer('EDGE', 'human:x', '   ')
    expect(result).toEqual({ ok: false, message: 'Enter a name to join.' })
    expect(everyone('EDGE')).toEqual(['ada'])
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

  it('sits a late arrival in an open chair instead of past the felt', () => {
    let full = createEmptyGame('EDGE', 'host', '1')
    for (let i = 0; i < 8; i++) full = addPlayer(full, `full-${i}`, `Full ${i}`, 500)
    rooms.set(tableSessionKey('EDGE', '1'), full)
    seatChip('EDGE', '2', 'cam', 'Cam')
    const result = seatLatePointsOnlyPlayer('EDGE', 'human:neo', 'Neo')
    expect(result).toMatchObject({ ok: true, tableId: '2' })
    expect(table('EDGE', '1').players).toHaveLength(8)
    expect(table('EDGE', '2').players.map((p) => p.id)).toEqual(['cam', 'human:neo'])
  })

  it('turns a late arrival away when every chair is taken', () => {
    let full = createEmptyGame('EDGE', 'host', '1')
    for (let i = 0; i < 8; i++) full = addPlayer(full, `full-${i}`, `Full ${i}`, 500)
    rooms.set(tableSessionKey('EDGE', '1'), full)
    const result = seatLatePointsOnlyPlayer('EDGE', 'human:neo', 'Neo')
    expect(result).toEqual({ ok: false, message: 'Every table is full.' })
    expect(table('EDGE', '1').players).toHaveLength(8)
  })
})

describe('seatLatePointsOnlyPlayer, seated', () => {
  it('seats a second person who shares a name, and numbers that name', () => {
    seatChip('EDGE', '1', 'ada', 'Ada')
    seatChip('EDGE', '2', 'cam', 'Cam')
    const result = seatLatePointsOnlyPlayer('EDGE', 'human:imposter', '  cAm ')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const named = table('EDGE', result.tableId).players.find((p) => p.id === 'human:imposter')
    expect(named?.name).toBe('cAm 2')
    expect(everyone('EDGE').sort()).toEqual(['ada', 'cam', 'human:imposter'])
  })

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

  it('seats a latecomer who shares a name, numbered so the first one stays', async () => {
    const { socket, events } = phone()
    await hello(socket, 'ADA', 'human:imposter')
    const ack = events.find((row) => row.event === 'ack')?.data
    expect(ack.ok).toBe(true)
    const named = [...rooms.values()].flatMap((gs) => gs.players).find((p) => p.id === 'human:imposter')
    expect(named?.name).toBe('ADA 2')
    expect(everyone('EDGE').sort()).toEqual(['ada', 'human:imposter'])
  })
})

describe('handleHello after seats exist', () => {
  beforeEach(() => {
    seatChip('EDGE', '1', 'ada', 'Ada')
    vi.spyOn(gameOps, 'emitVenueTableState').mockImplementation(() => {})
    vi.spyOn(gameOps, 'emitPlayerVenueBriefNow').mockImplementation(() => {})
    vi.spyOn(gameOps, 'emitDisplayVenueSnapshotNow').mockImplementation(() => {})
  })

  it('gives a new phone points, not chips, even if the welcome flag was lost', async () => {
    const { socket, events } = phone()
    await handleHello(socket as never, {
      role: 'player',
      name: 'Bea',
      roomCode: 'EDGE',
      tableId: 'LOBBY',
      playerId: 'human:bea',
    })
    const ack = events.find((row) => row.event === 'ack')?.data
    expect(ack.ok).toBe(true)
    const bea = [...rooms.values()].flatMap((gs) => gs.players).find((p) => p.id === 'human:bea')
    expect(bea).toMatchObject({ pointsOnly: true, bankroll: 0 })
    expect(table('EDGE', '1').players.find((p) => p.id === 'ada')?.bankroll).toBe(500)
  })

  it('still gives chips when the only people at a table are rehearsal bots', async () => {
    seatChip('EDGE', '1', 'vp:bot', 'Bot')
    const { socket, events } = phone()
    await handleHello(socket as never, {
      role: 'player',
      name: 'Bea',
      roomCode: 'EDGE',
      tableId: 'LOBBY',
      playerId: 'human:bea',
    })
    const ack = events.find((row) => row.event === 'ack')?.data
    expect(ack.ok).toBe(true)
    const bea = [...rooms.values()].flatMap((gs) => gs.players).find((p) => p.id === 'human:bea')
    expect(bea).toMatchObject({ pointsOnly: false, bankroll: 1000 })
  })
})
