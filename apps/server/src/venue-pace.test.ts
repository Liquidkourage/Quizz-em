import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  bindGameIo,
  clearAnswerRevealClocks,
  closeGuessingIfReady,
  commitTableAdvance,
  prepareVenuePersistence,
  rooms,
  setVenuePace,
  tableSessionKey,
} from './game-ops'

vi.mock('./venue-library-db', () => ({
  loadVenueLibraries: async () => new Map(),
  persistVenueLibraries: async () => {},
}))

function closedStreet(venue: string, tableId: string, round: number, cards: number): GameState {
  let gs = createEmptyGame(venue, 'host', tableId)
  gs = addPlayer(gs, `${tableId}-a`, 'Ada', 500)
  gs = addPlayer(gs, `${tableId}-b`, 'Bo', 500)
  return {
    ...gs,
    phase: 'betting',
    streetPlan: [0, 5],
    round: {
      ...gs.round,
      bettingRound: round,
      isBettingOpen: false,
      streetPlan: [0, 5],
      communityCards: Array.from({ length: cards }, (_, index) => ({ digit: index })) as never,
      question: { id: 'q', text: '?', answer: 10 },
    },
  }
}

beforeAll(async () => {
  await prepareVenuePersistence()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  rooms.clear()
  bindGameIo({
    to: () => ({ emit: () => undefined }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
  } as unknown as Server)
})

afterEach(() => {
  clearAnswerRevealClocks()
  vi.useRealTimers()
})

describe('table pace', () => {
  it('keeps a finished street waiting while the room is in sync', () => {
    const key = tableSessionKey('SYNC', '1')
    const gs = closedStreet('SYNC', '1', 1, 0)
    rooms.set(key, gs)
    commitTableAdvance(key, gs, gs)
    expect(rooms.get(key)!.round.communityCards).toHaveLength(0)
    expect(rooms.get(key)!.phase).toBe('betting')
  })

  it('deals the next street on a finished table and leaves a table that is still betting', () => {
    const done = tableSessionKey('ASY', '1')
    const live = tableSessionKey('ASY', '2')
    rooms.set(done, closedStreet('ASY', '1', 1, 0))
    const stillBetting = closedStreet('ASY', '2', 1, 0)
    rooms.set(live, {
      ...stillBetting,
      round: { ...stillBetting.round, isBettingOpen: true, currentPlayerIndex: 0 },
    })
    setVenuePace('ASY', 'async')
    expect(rooms.get(done)!.round.communityCards).toHaveLength(5)
    expect(rooms.get(done)!.round.bettingRound).toBe(2)
    expect(rooms.get(done)!.round.isBettingOpen).toBe(true)
    expect(rooms.get(live)!.round.communityCards).toHaveLength(0)
    expect(rooms.get(live)!.phase).toBe('betting')
  })

  it('opens guessing on a table that has finished its streets and does not reveal while another table is still betting', () => {
    const done = tableSessionKey('ASZ', '1')
    const live = tableSessionKey('ASZ', '2')
    rooms.set(done, closedStreet('ASZ', '1', 2, 5))
    rooms.set(live, closedStreet('ASZ', '2', 1, 0))
    setVenuePace('ASZ', 'async')
    const finished = rooms.get(done)!
    expect(finished.phase).toBe('answering')
    expect(finished.round.answerRevealAt).toBeUndefined()
    expect(rooms.get(live)!.phase).toBe('betting')
    expect(rooms.get(live)!.round.communityCards).toHaveLength(5)
  })

  it('reveals only once every table has reached guessing and that window is closed', () => {
    const first = tableSessionKey('ASW', '1')
    const second = tableSessionKey('ASW', '2')
    rooms.set(first, closedStreet('ASW', '1', 2, 5))
    rooms.set(second, closedStreet('ASW', '2', 2, 5))
    setVenuePace('ASW', 'async')
    expect(rooms.get(first)!.phase).toBe('answering')
    expect(rooms.get(second)!.phase).toBe('answering')
    expect(rooms.get(first)!.round.answerRevealAt).toBeUndefined()

    for (const key of [first, second]) {
      const gs = rooms.get(key)!
      rooms.set(key, {
        ...gs,
        players: gs.players.map((player) => ({ ...player, submittedAnswer: 10 })),
      })
    }
    closeGuessingIfReady('ASW')
    expect(rooms.get(first)!.round.answerRevealAt).toBe(1_000_000 + 5_000)
    expect(rooms.get(second)!.round.answerRevealAt).toBe(1_000_000 + 5_000)
    expect(rooms.get(first)!.phase).toBe('answering')
  })
})
