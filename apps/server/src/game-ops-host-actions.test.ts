import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  bindGameIo,
  getPlayhead,
  moveSeatedPlayer,
  prepareVenuePersistence,
  rooms,
  setVenueRoomHold,
  tableSessionKey,
} from './game-ops'

// No real database in unit tests: the venue library store is an empty in-memory map.
vi.mock('./venue-library-db', () => ({
  loadVenueLibraries: async () => new Map(),
  persistVenueLibraries: async () => {},
}))

/** Pins today's behavior of the host actions that move players and freeze the room. */

function fakeIo(): { server: Server; emitted: string[] } {
  const emitted: string[] = []
  const server = {
    to: () => ({ emit: (event: string) => void emitted.push(event) }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
  } as unknown as Server
  return { server, emitted }
}

function seat(venue: string, tableId: string, playerIds: string[]): GameState {
  let gs = createEmptyGame(venue, 'host-1', tableId)
  for (const id of playerIds) gs = addPlayer(gs, id, id)
  rooms.set(tableSessionKey(venue, tableId), gs)
  return gs
}

beforeAll(async () => {
  await prepareVenuePersistence()
})

beforeEach(() => {
  vi.useFakeTimers()
  rooms.clear()
  bindGameIo(fakeIo().server)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getPlayhead', () => {
  it('starts at the top with no setlist chosen', () => {
    expect(getPlayhead('nowhere')).toEqual({ setlistId: null, nextIndex: 0 })
  })
})

describe('moveSeatedPlayer refusals', () => {
  it('rejects table numbers outside 1 to 20', () => {
    seat('BAR', '1', ['p1'])
    expect(moveSeatedPlayer('bar', 'p1', 0)).toEqual({ ok: false, message: 'Pick a table from 1 to 20.' })
    expect(moveSeatedPlayer('bar', 'p1', 21)).toEqual({ ok: false, message: 'Pick a table from 1 to 20.' })
    expect(moveSeatedPlayer('bar', 'p1', Number.NaN).ok).toBe(false)
  })

  it('rejects a player who is not seated', () => {
    seat('BAR', '1', ['p1'])
    expect(moveSeatedPlayer('bar', 'ghost', 2)).toEqual({ ok: false, message: 'That player is not seated at a table.' })
  })

  it('rejects a move to the table the player already sits at', () => {
    seat('BAR', '1', ['p1'])
    expect(moveSeatedPlayer('bar', 'p1', 1)).toEqual({ ok: false, message: 'p1 is already at table 1.' })
  })

  it('rejects moves while any table is mid-hand', () => {
    seat('BAR', '1', ['p1'])
    const busy = seat('BAR', '2', ['p2'])
    rooms.set('BAR:2', { ...busy, phase: 'betting' } as GameState)
    expect(moveSeatedPlayer('bar', 'p1', 3)).toEqual({
      ok: false,
      message: 'Move players between hands, when every table is waiting.',
    })
  })
})

describe('moveSeatedPlayer success', () => {
  it('moves a player between hands and leaves the old table without them', () => {
    seat('BAR', '1', ['p1', 'p2'])
    const result = moveSeatedPlayer('bar', 'p1', 3)
    expect(result).toEqual({ ok: true, message: 'Moved p1 from table 1 to table 3.' })
    expect(rooms.get('BAR:1')?.players.map((p) => p.id)).toEqual(['p2'])
    expect(rooms.get('BAR:3')?.players.map((p) => p.id)).toEqual(['p1'])
  })
})

describe('setVenueRoomHold', () => {
  it('reports held when freezing, and stays held if asked twice', () => {
    expect(setVenueRoomHold('held', true)).toBe(true)
    expect(setVenueRoomHold('held', true)).toBe(true)
    setVenueRoomHold('held', false)
  })

  it('reports not held when resuming, and false when nothing was held', () => {
    expect(setVenueRoomHold('club', false)).toBe(false)
    setVenueRoomHold('club', true)
    expect(setVenueRoomHold('club', false)).toBe(false)
  })

  it('pushes the answer deadline back by the time the room was frozen', () => {
    // Hold state lives at module level, so this test uses a venue no other test touches.
    const gs = seat('FREEZE', '1', ['p1'])
    rooms.set('FREEZE:1', { ...gs, round: { ...gs.round, answerDeadline: 100_000 } } as GameState)
    vi.setSystemTime(10_000)
    setVenueRoomHold('freeze', true)
    vi.setSystemTime(14_000)
    setVenueRoomHold('freeze', false)
    expect(rooms.get('FREEZE:1')?.round.answerDeadline).toBe(104_000)
  })
})
