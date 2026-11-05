import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame, endRound } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  bindGameIo,
  clearGuessNudgeClocks,
  clearHumanTurnClock,
  HUMAN_NUDGE_TIMEOUT_MS,
  humanTurnDeadlineMs,
  nudgeActingHumansVenue,
  nudgeOpenGuesses,
  prepareVenuePersistence,
  resolveHumanTurnActor,
  rooms,
  setVenueRoomHold,
  syncHumanTurnDeadline,
  tableSessionKey,
  venueShowdownAtMs,
} from './game-ops'
import { planVenueWageringOrchestration } from './venue-wagering-orchestration'
import {
  clearPlayerSocketRegistry,
  initPlayerSocketRegistry,
  registerPlayerSocket,
} from './player-socket-registry'

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
  clearGuessNudgeClocks()
  clearPlayerSocketRegistry()
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

  it('names a rehearsal bot whose turn it is, the same as a person', () => {
    const base = bettingTable('T1', '1')
    const cpu = {
      ...base,
      players: base.players.map((p, i) => (i === 0 ? { ...p, id: 'vp:cpu1', name: 'Ada A.' } : p)),
    } as GameState
    expect(resolveHumanTurnActor(cpu)).toEqual({
      seatIndex: 0,
      playerId: 'vp:cpu1',
      playerName: 'Ada A.',
    })
  })

  it('finds nobody when the acting seat is folded or plays for points only', () => {
    const base = bettingTable('T1', '1')
    const withSeat0 = (patch: Record<string, unknown>) =>
      ({ ...base, players: base.players.map((p, i) => (i === 0 ? { ...p, ...patch } : p)) }) as GameState
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

  it('starts the same 30s clock when a rehearsal bot is the one to act', () => {
    const { key, gs } = put('N4', '1')
    rooms.set(key, {
      ...gs,
      players: gs.players.map((p, i) => (i === 0 ? { ...p, id: 'vp:ada', name: 'Ada A.' } : p)),
    })
    expect(nudgeActingHumansVenue('n4')).toEqual({ nudged: 1, names: ['Ada A.'] })
    expect(humanTurnDeadlineMs.get(key)).toBe(1_030_000)
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

  it('checks a rehearsal bot who owes nothing when the nudge runs out, and leaves the other bots to act', async () => {
    const { key, gs } = put('A5', '1')
    rooms.set(key, {
      ...gs,
      players: ['Ada A.', 'Bea B.', 'Cal C.'].map((name, i) => ({
        ...gs.players[0]!,
        id: `vp:a5:${i}`,
        name,
      })),
    })
    const previousDelay = process.env.QHE_CPU_VP_ACTION_DELAY_MS
    process.env.QHE_CPU_VP_ACTION_DELAY_MS = '120000'
    nudgeActingHumansVenue('a5')
    await vi.advanceTimersByTimeAsync(30_000)
    process.env.QHE_CPU_VP_ACTION_DELAY_MS = previousDelay
    const after = rooms.get(key)!
    expect(toasts).toContain('Ada A. nudged time up — checked.')
    expect(after.round.isBettingOpen).toBe(true)
    expect(after.round.currentPlayerIndex).not.toBe(0)
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

describe('nudge open guesses', () => {
  it('gives 30s, then a missed guess scores 0 and cannot take the pot', async () => {
    const key = tableSessionKey('NG', '1')
    let gs = createEmptyGame('NG', 'host', '1')
    gs = addPlayer(gs, 'ada', 'Ada', 500)
    gs = addPlayer(gs, 'bo', 'Bo', 500)
    rooms.set(key, {
      ...gs,
      phase: 'answering',
      round: {
        ...gs.round,
        answerDeadline: 1_000_000,
        pot: 40,
        handContributions: { ada: 20, bo: 20 },
        question: { id: 'q', text: '?', answer: 10 },
      },
      players: [
        { ...gs.players[0]!, submittedAnswer: 10, bankroll: 500 },
        { ...gs.players[1]!, bankroll: 500 },
      ],
    })

    const heard: Record<string, string[]> = { ada: [], bo: [] }
    initPlayerSocketRegistry({
      sockets: {
        sockets: new Map([
          ['ada-sock', { emit: (event: string, msg: unknown) => { if (event === 'toast') heard.ada!.push(String(msg)) } }],
          ['bo-sock', { emit: (event: string, msg: unknown) => { if (event === 'toast') heard.bo!.push(String(msg)) } }],
        ]),
      },
    } as unknown as Server)
    registerPlayerSocket('ada', 'ada-sock')
    registerPlayerSocket('bo', 'bo-sock')

    expect(nudgeOpenGuesses('NG')).toEqual({ nudged: 1, names: ['Bo'] })
    expect(rooms.get(key)!.round.answerDeadline).toBe(1_030_000)
    expect(rooms.get(key)!.round.guessNudge).toBe(true)
    expect(heard.bo).toContain('30 seconds to lock a guess. No guess scores 0 and cannot win the pot.')
    expect(heard.ada).toEqual([])
    expect(toasts).not.toContain('30 seconds to lock a guess. No guess scores 0 and cannot win the pot.')

    await vi.advanceTimersByTimeAsync(HUMAN_NUDGE_TIMEOUT_MS)
    const after = rooms.get(key)!
    expect(after.players.find((p) => p.id === 'bo')!.answerForfeited).toBe(true)
    expect(after.players.find((p) => p.id === 'ada')!.answerForfeited).not.toBe(true)

    const paid = endRound({ ...after, phase: 'showdown' })
    expect(paid.players.find((p) => p.id === 'bo')!.bankroll).toBe(500)
    expect(paid.players.find((p) => p.id === 'bo')!.answerPoints ?? 0).toBe(0)
    expect(paid.players.find((p) => p.id === 'ada')!.bankroll).toBe(540)
  })

  it('keeps the extra 30s on the venue clock the TVs are reading', () => {
    const key = tableSessionKey('NG', '1')
    venueShowdownAtMs.set('NG', 1_000_000)
    let gs = createEmptyGame('NG', 'host', '1')
    gs = addPlayer(gs, 'ada', 'Ada', 500)
    gs = addPlayer(gs, 'bo', 'Bo', 500)
    rooms.set(key, {
      ...gs,
      phase: 'answering',
      round: { ...gs.round, answerDeadline: 1_000_000, question: { id: 'q', text: '?', answer: 10 } },
      players: [
        { ...gs.players[0]!, submittedAnswer: 10 },
        { ...gs.players[1]! },
      ],
    })

    nudgeOpenGuesses('NG')
    expect(venueShowdownAtMs.get('NG')).toBe(1_030_000)
    expect(rooms.get(key)!.round.answerDeadline).toBe(1_030_000)

    const plan = planVenueWageringOrchestration({
      seatedTableKeys: [key],
      getState: (tk) => rooms.get(tk),
      currentShowdownAtMs: venueShowdownAtMs.get('NG'),
      nowMs: 1_000_000,
    })
    expect(plan.tableUpdates).toEqual([])
    venueShowdownAtMs.delete('NG')
  })
})
