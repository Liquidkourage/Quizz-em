import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  bindGameIo,
  clearHumanTurnClock,
  HUMAN_NUDGE_TIMEOUT_MS,
  humanTurnDeadlineMs,
  nudgeActingHumansVenue,
  prepareVenuePersistence,
  resolveHumanTurnActor,
  rooms,
  setVenueRoomHold,
  syncHumanTurnDeadline,
  tableSessionKey,
} from './game-ops'

vi.mock('./venue-library-db', () => ({
  loadVenueLibraries: async () => new Map(),
  persistVenueLibraries: async () => {},
}))

/** Pins the host-nudge turn clock: who is "acting", when a deadline exists, and the auto check or fold. */

const toasts: string[] = []

function bettingTable(venue: string, tableId: string, over: Record<string, unknown> = {}): GameState {
  let gs = createEmptyGame(venue, 'host', tableId)
  gs = addPlayer(gs, `${venue}-p1`, 'Ann')
  gs = addPlayer(gs, `${venue}-p2`, 'Bo')
  return {
    ...gs,
    phase: 'betting',
    round: { ...gs.round, isBettingOpen: true, currentPlayerIndex: 0, currentBet: 0, playerBets: {}, ...over },
  } as unknown as GameState
}

function put(venue: string, tableId: string, over: Record<string, unknown> = {}): { key: string; gs: GameState } {
  const key = tableSessionKey(venue, tableId)
  const gs = bettingTable(venue, tableId, over)
  rooms.set(key, gs)
  return { key, gs }
}

beforeAll(async () => {
  await prepareVenuePersistence()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  rooms.clear()
  toasts.length = 0
  bindGameIo({
    to: () => ({ emit: (event: string, msg: unknown) => void (event === 'toast' && toasts.push(String(msg))) }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
  } as unknown as Server)
})

afterEach(() => {
  for (const key of rooms.keys()) clearHumanTurnClock(key)
  vi.useRealTimers()
})

describe('resolveHumanTurnActor', () => {
  it('names the human whose turn it is', () => {
    expect(resolveHumanTurnActor(bettingTable('T1', '1'))).toEqual({
      seatIndex: 0,
      playerId: 'T1-p1',
      playerName: 'Ann',
    })
  })

  it('finds nobody when betting is closed or the table is not in a betting phase', () => {
    expect(resolveHumanTurnActor(bettingTable('T1', '1', { isBettingOpen: false }))).toBeNull()
    expect(resolveHumanTurnActor({ ...bettingTable('T1', '1'), phase: 'answering' } as GameState)).toBeNull()
  })

  it('finds nobody when the acting seat is a computer player, is folded, or plays for points only', () => {
    const base = bettingTable('T1', '1')
    const withSeat0 = (patch: Record<string, unknown>) =>
      ({ ...base, players: base.players.map((p, i) => (i === 0 ? { ...p, ...patch } : p)) }) as GameState
    expect(resolveHumanTurnActor(withSeat0({ id: 'vp:cpu1' }))).toBeNull()
    expect(resolveHumanTurnActor(withSeat0({ hasFolded: true }))).toBeNull()
    expect(resolveHumanTurnActor(withSeat0({ pointsOnly: true }))).toBeNull()
  })

  it('finds nobody when the seat index is out of range', () => {
    expect(resolveHumanTurnActor(bettingTable('T1', '1', { currentPlayerIndex: 9 }))).toBeNull()
    expect(resolveHumanTurnActor(bettingTable('T1', '1', { currentPlayerIndex: -1 }))).toBeNull()
  })
})

describe('syncHumanTurnDeadline', () => {
  it('starts with no clock for a new actor, and keeps a deadline set for that actor', () => {
    const { key, gs } = put('T2', '1')
    expect(syncHumanTurnDeadline(key, gs)).toBeUndefined()
    humanTurnDeadlineMs.set(key, 5_000_000)
    expect(syncHumanTurnDeadline(key, gs)).toBe(5_000_000)
  })

  it('drops the deadline when the turn passes to someone else', () => {
    const { key, gs } = put('T3', '1')
    syncHumanTurnDeadline(key, gs)
    humanTurnDeadlineMs.set(key, 5_000_000)
    const next = { ...gs, round: { ...gs.round, currentPlayerIndex: 1 } } as GameState
    expect(syncHumanTurnDeadline(key, next)).toBeUndefined()
    expect(humanTurnDeadlineMs.has(key)).toBe(false)
  })

  it('clears the clock when nobody is acting', () => {
    const { key, gs } = put('T4', '1')
    syncHumanTurnDeadline(key, gs)
    humanTurnDeadlineMs.set(key, 5_000_000)
    expect(syncHumanTurnDeadline(key, { ...gs, phase: 'lobby' } as GameState)).toBeUndefined()
    expect(humanTurnDeadlineMs.has(key)).toBe(false)
  })
})

describe('nudgeActingHumansVenue', () => {
  it('gives every table with an acting human a 30 second deadline and lists their names', () => {
    const a = put('N1', '1')
    const b = put('N1', '2', { currentPlayerIndex: 1 })
    const result = nudgeActingHumansVenue('n1')
    expect(HUMAN_NUDGE_TIMEOUT_MS).toBe(30_000)
    expect(result).toEqual({ nudged: 2, names: ['Ann', 'Bo'] })
    expect(humanTurnDeadlineMs.get(a.key)).toBe(1_030_000)
    expect(humanTurnDeadlineMs.get(b.key)).toBe(1_030_000)
  })

  it('skips tables where nobody is acting', () => {
    put('N2', '1', { isBettingOpen: false })
    expect(nudgeActingHumansVenue('n2')).toEqual({ nudged: 0, names: [] })
  })

  it('nudges the acting human on one table and leaves the others waiting', () => {
    const a = put('N3', '1')
    const b = put('N3', '2', { currentPlayerIndex: 1 })
    expect(nudgeActingHumansVenue('n3', 2)).toEqual({ nudged: 1, names: ['Bo'] })
    expect(humanTurnDeadlineMs.has(a.key)).toBe(false)
    expect(humanTurnDeadlineMs.get(b.key)).toBe(1_030_000)
  })
})

describe('auto check or fold after a nudge', () => {
  it('checks for a player who owes nothing when time runs out', async () => {
    put('A1', '1')
    nudgeActingHumansVenue('a1')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(toasts).toContain('Ann nudged time up — checked.')
  })

  it('folds a player who owes chips when time runs out', async () => {
    put('A2', '1', { currentBet: 20 })
    nudgeActingHumansVenue('a2')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(toasts).toContain('Ann nudged time up — folded.')
  })

  it('does nothing before the 30 seconds are up', async () => {
    put('A3', '1')
    nudgeActingHumansVenue('a3')
    await vi.advanceTimersByTimeAsync(29_999)
    expect(toasts.filter((t) => t.includes('nudged time up'))).toEqual([])
  })

  it('does nothing while the room is on hold', async () => {
    put('A4', '1')
    nudgeActingHumansVenue('a4')
    setVenueRoomHold('a4', true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(toasts.filter((t) => t.includes('nudged time up'))).toEqual([])
    setVenueRoomHold('a4', false)
  })
})
