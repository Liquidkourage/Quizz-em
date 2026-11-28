import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame, HOLE_DEAL_DELAY_MS, type Question } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  applyQuestionToAllPlayable,
  bindGameIo,
  clearHoleDealClocks,
  prepareVenuePersistence,
  rooms,
  setVenueHoleDeal,
  tableSessionKey,
} from './game-ops'

vi.mock('./venue-library-db', () => ({
  loadVenueLibraries: async () => new Map(),
  persistVenueLibraries: async () => {},
}))

const QUESTION: Question = { id: 'q', text: 'How many?', answer: 10 }

function seated(venue: string): string {
  const key = tableSessionKey(venue, '1')
  let gs = createEmptyGame(venue, 'host', '1')
  gs = addPlayer(gs, 'ada', 'Ada', 500)
  gs = addPlayer(gs, 'bo', 'Bo', 500)
  rooms.set(key, gs)
  return key
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
  clearHoleDealClocks()
  vi.useRealTimers()
})

describe('automatic hole cards', () => {
  it('leaves the cards for the host when that option is off', () => {
    const key = seated('MANUAL')
    applyQuestionToAllPlayable('MANUAL', QUESTION)
    vi.advanceTimersByTime(HOLE_DEAL_DELAY_MS)
    expect(rooms.get(key)!.players.every((player) => player.hand.length === 0)).toBe(true)
    expect(rooms.get(key)!.phase).toBe('question')
  })

  it('deals two hole cards 10 seconds after the question and leaves betting closed', () => {
    const key = seated('AUTO')
    setVenueHoleDeal('AUTO', 'auto')
    applyQuestionToAllPlayable('AUTO', QUESTION)
    vi.advanceTimersByTime(HOLE_DEAL_DELAY_MS - 1)
    expect(rooms.get(key)!.players[0]!.hand).toHaveLength(0)
    vi.advanceTimersByTime(1)
    const after = rooms.get(key)!
    expect(after.players.every((player) => player.hand.length === 2)).toBe(true)
    expect(after.phase).toBe('question')
    expect(after.round.isBettingOpen).toBe(false)
  })

  it('stops the countdown when the host takes the deal back', () => {
    const key = seated('BACK')
    setVenueHoleDeal('BACK', 'auto')
    applyQuestionToAllPlayable('BACK', QUESTION)
    setVenueHoleDeal('BACK', 'host')
    vi.advanceTimersByTime(HOLE_DEAL_DELAY_MS)
    expect(rooms.get(key)!.players.every((player) => player.hand.length === 0)).toBe(true)
  })
})
