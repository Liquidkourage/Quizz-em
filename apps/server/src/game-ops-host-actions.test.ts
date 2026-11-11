import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame, winnerScreensReadyAt, type NumericCard } from '@qhe/core'
import type { GameState } from '@qhe/core'
import { rehearsalAnswerScript } from './virtual-players'
import {
  buildHostVenueFloorBrief,
  clearVenueHostLog,
  getVenueLastHandDisplay,
  recordVenueHostHandResults,
  recordVenueMovesBetweenStates,
  setVenueLastHandDisplay,
} from './venue-host-log'
import type { Server } from 'socket.io'
import {
  applyQuestionToAllPlayable,
  bindGameIo,
  clearVenueWinnerScreens,
  noteVenueWinnerScreens,
  venueWinnerScreensBlockPayout,
  buildHostLibraryPayload,
  applyVenueWageringOrchestration,
  dealCommunityBoardForVenue,
  ensureVenueLibrary,
  getPlayhead,
  rewindVenuePlayhead,
  moveSeatedPlayer,
  prepareVenuePersistence,
  cpuVpDrainPending,
  rooms,
  setVenueRoomHold,
  tableSessionKey,
  venueDisplayLayouts,
  venueLibraries,
  venuePlayhead,
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

describe('winner screens before payout', () => {
  it('holds payout until every winner screen has been shown once', () => {
    clearVenueWinnerScreens('WIN')
    const started = 1_000_000
    vi.setSystemTime(started)
    for (const [tableId, playerId] of [
      ['1', 'a'],
      ['2', 'b'],
    ] as const) {
      const gs = seat('WIN', tableId, [playerId])
      rooms.set(tableSessionKey('WIN', tableId), { ...gs, phase: 'showdown' })
    }
    noteVenueWinnerScreens('WIN')
    const ready = winnerScreensReadyAt(started, 2)
    expect(venueWinnerScreensBlockPayout('WIN', started)).toContain('The answer is still on the screens')
    expect(venueWinnerScreensBlockPayout('WIN', ready - 1)).toContain('1s')
    expect(venueWinnerScreensBlockPayout('WIN', ready)).toBeNull()
    noteVenueWinnerScreens('WIN', ready + 5_000)
    expect(venueWinnerScreensBlockPayout('WIN', ready)).toBeNull()
    clearVenueWinnerScreens('WIN')
  })
})

describe('getPlayhead', () => {
  it('starts at the top with no setlist chosen', () => {
    expect(getPlayhead('nowhere')).toEqual({ setlistId: null, nextIndex: 0 })
  })

  it('puts a hard reset back on question 1 of the same rundown', () => {
    venuePlayhead.set('RESETQ', { setlistId: 'starter-set', nextIndex: 1 })
    rewindVenuePlayhead('RESETQ')
    expect(getPlayhead('RESETQ')).toEqual({ setlistId: 'starter-set', nextIndex: 0 })
  })
})

describe('playlists across rooms', () => {
  it('shows a playlist saved in one room when the host opens another', async () => {
    venueLibraries.clear()
    venuePlayhead.clear()
    const first = await ensureVenueLibrary('ROOM1')
    first.questions.push({ id: 'custom-1', text: 'Custom cue', answer: 1969 })
    first.setlists.push({ id: 'sl-night', name: 'Friday night', questionIds: ['custom-1'] })
    const other = await buildHostLibraryPayload('ROOM2')
    expect(other.setlists.map((setlist) => setlist.name)).toContain('Friday night')
    expect(other.questions.some((question) => question.id === 'custom-1' && question.answer === 1969)).toBe(true)
    const again = await buildHostLibraryPayload('ROOM1')
    expect(again.setlists.map((setlist) => setlist.name)).toContain('Friday night')
    venueLibraries.clear()
    venuePlayhead.clear()
  })
})

describe('next question in the list', () => {
  it('offers the starter list when the host has not picked a rundown', async () => {
    venuePlayhead.delete('HOST01')
    venueLibraries.delete('HOST01')
    const payload = await buildHostLibraryPayload('HOST01')
    expect(payload.activeSetlistId).toBe('starter-set')
    expect(payload.activeSetlistNextIndex).toBe(0)
  })

  it('keeps free play when the host cleared the list', async () => {
    venuePlayhead.set('FREEPLAY', { setlistId: null, nextIndex: 0 })
    const payload = await buildHostLibraryPayload('FREEPLAY')
    expect(payload.activeSetlistId).toBeNull()
  })

  it('moves the list forward after the question on the tables', async () => {
    venuePlayhead.delete('QNEXT')
    venueLibraries.delete('QNEXT')
    const lib = await ensureVenueLibrary('QNEXT')
    seat('QNEXT', '1', ['p1'])
    const first = lib.questions.find((q) => q.id === 'q1')
    expect(first).toBeDefined()
    applyQuestionToAllPlayable('QNEXT', first!)
    const payload = await buildHostLibraryPayload('QNEXT')
    expect(payload.activeSetlistId).toBe('starter-set')
    expect(payload.activeSetlistNextIndex).toBe(1)
  })

  it('returns the public display to the tables when a question starts', async () => {
    venuePlayhead.delete('TVBACK')
    venueLibraries.delete('TVBACK')
    venueDisplayLayouts.set('TVBACK', {
      layout: 'venueWall',
      focusTable: null,
      wallView: 'seating-chart',
    })
    const lib = await ensureVenueLibrary('TVBACK')
    seat('TVBACK', '1', ['p1'])
    const first = lib.questions.find((q) => q.id === 'q1')
    applyQuestionToAllPlayable('TVBACK', first!)
    expect(venueDisplayLayouts.get('TVBACK')?.wallView).toBe('floor')
  })

  it('clears this hand’s busts and bets when a question starts and keeps session wins', async () => {
    venuePlayhead.delete('NEWHAND')
    venueLibraries.delete('NEWHAND')
    clearVenueHostLog('NEWHAND')
    const lib = await ensureVenueLibrary('NEWHAND')
    seat('NEWHAND', '1', ['p1'])
    let paid = createEmptyGame('NEWHAND', 'host', '1')
    paid = {
      ...paid,
      phase: 'showdown',
      players: [
        { id: 'human:a', name: 'Ada L.', bankroll: 1000, hand: [], hasFolded: false, isAllIn: false },
        { id: 'human:b', name: 'Bob D.', bankroll: 1000, hand: [], hasFolded: true, isAllIn: false },
      ],
      round: { ...paid.round, pot: 400 },
    }
    recordVenueHostHandResults('NEWHAND', [{ tableNum: 1, before: paid, after: paid }])
    const betting = {
      ...paid,
      phase: 'betting' as const,
      round: { ...paid.round, isBettingOpen: true, lastSeatBettingAction: [null, null] as (null)[], playerBets: {} },
    }
    const raised = {
      ...betting,
      players: betting.players.map((p) => (p.id === 'human:a' ? { ...p, bankroll: 600 } : p)),
      round: {
        ...betting.round,
        currentBet: 400,
        lastSeatBettingAction: ['raise' as const, null],
        playerBets: { 'human:a': 400 },
      },
    }
    recordVenueMovesBetweenStates('NEWHAND', 1, betting, raised)
    setVenueLastHandDisplay('NEWHAND', [{ name: 'Bob D.', tableNum: 1, atMs: 1 }])
    const before = buildHostVenueFloorBrief({
      venueCode: 'NEWHAND',
      tiles: [],
      fieldPlayerCount: 1,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(before.busts.map((b) => b.name)).toEqual(['Bob D.'])
    expect(before.handBets.length).toBeGreaterThan(0)
    expect(before.bigWinners.map((w) => w.name)).toContain('Ada L.')

    const first = lib.questions.find((q) => q.id === 'q1')
    applyQuestionToAllPlayable('NEWHAND', first!)
    const after = buildHostVenueFloorBrief({
      venueCode: 'NEWHAND',
      tiles: [],
      fieldPlayerCount: 1,
      liveTableCount: 1,
      bigBlindHint: 20,
    })
    expect(after.busts).toEqual([])
    expect(after.handBets).toEqual([])
    expect(after.bigWinners.map((w) => w.name)).toContain('Ada L.')
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
    expect(getVenueLastHandDisplay('BAR')?.seating?.moves).toEqual([
      { name: 'p1', fromTableNum: 1, toTableNum: 3, byline: 'HOST DISCRETION' },
    ])
  })
})

describe('dealCommunityBoardForVenue', () => {
  it('leaves the hand alone while a player is still betting', () => {
    let gs = seat('STILLBET', '1', ['p1', 'p2'])
    gs = {
      ...gs,
      phase: 'betting',
      round: {
        ...gs.round,
        bettingRound: 1,
        isBettingOpen: true,
        currentPlayerIndex: 0,
        communityCards: [],
      },
    }
    rooms.set(tableSessionKey('STILLBET', '1'), gs)
    expect(dealCommunityBoardForVenue('STILLBET')).toBe(false)
    const after = rooms.get(tableSessionKey('STILLBET', '1'))
    expect(after?.round.isBettingOpen).toBe(true)
    expect(after?.round.communityCards).toEqual([])
  })

  it('leaves the five community cards for the host when round 1 is already closed', () => {
    let gs = seat('HOLDBOARD', '1', ['p1', 'p2'])
    gs = {
      ...gs,
      phase: 'betting',
      round: {
        ...gs.round,
        bettingRound: 1,
        isBettingOpen: false,
        currentPlayerIndex: -1,
        communityCards: [],
      },
    }
    rooms.set(tableSessionKey('HOLDBOARD', '1'), gs)
    applyVenueWageringOrchestration('HOLDBOARD')
    const after = rooms.get(tableSessionKey('HOLDBOARD', '1'))
    expect(after?.round.communityCards).toEqual([])
    expect(after?.round.bettingRound).toBe(1)
  })

  it('deals the five community cards when the host asks after round 1', () => {
    let gs = seat('HOSTDEAL', '1', ['p1', 'p2'])
    gs = {
      ...gs,
      phase: 'betting',
      round: {
        ...gs.round,
        bettingRound: 1,
        isBettingOpen: false,
        currentPlayerIndex: -1,
        communityCards: [],
      },
    }
    rooms.set(tableSessionKey('HOSTDEAL', '1'), gs)
    expect(dealCommunityBoardForVenue('HOSTDEAL')).toBe(true)
    const after = rooms.get(tableSessionKey('HOSTDEAL', '1'))
    expect(after?.round.communityCards).toHaveLength(5)
    expect(after?.round.bettingRound).toBe(2)
    expect(after?.phase).toBe('betting')
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

function closeSeatId(index: number): string {
  let seen = 0
  for (let i = 0; i < 20_000; i++) {
    const id = `vp:pace:${i}`
    if (rehearsalAnswerScript(id, 'r1') !== 'close') continue
    if (seen === index) return id
    seen += 1
  }
  throw new Error('close seat')
}

describe('CPU answer window', () => {
  it('opens the window without locking every guess', () => {
    const ids = [0, 1, 2, 3].map(closeSeatId)
    const card = (n: number): NumericCard => ({ digit: n as NumericCard['digit'] })
    let gs = createEmptyGame('PACEANS', 'host-1', '1')
    gs = {
      ...gs,
      phase: 'betting',
      players: ids.map((id, i) => ({
        id,
        name: id,
        bankroll: 1000,
        hand: [card(1), card(i + 2)],
        hasFolded: false,
        isAllIn: false,
      })),
      round: {
        ...gs.round,
        roundId: 'r1',
        question: { id: 'q', text: 'How many?', answer: 30 },
        bettingRound: 2,
        isBettingOpen: false,
        currentPlayerIndex: -1,
        communityCards: [3, 4, 5, 6, 7].map(card),
      },
    }
    const key = tableSessionKey('PACEANS', '1')
    rooms.set(key, gs)
    applyVenueWageringOrchestration('PACEANS')
    const after = rooms.get(key)
    expect(after?.phase).toBe('answering')
    expect(after?.players.every((p) => p.submittedAnswer === undefined)).toBe(true)
    rooms.delete(key)
    cpuVpDrainPending.delete(key)
  })
})
