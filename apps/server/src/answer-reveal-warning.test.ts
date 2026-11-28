import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, ANSWER_REVEAL_WARNING_MS, answerRevealWarning, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  beginAnswerWindow,
  bindGameIo,
  closeGuessingIfReady,
  sweepAnswerWindows,
  clearAnswerRevealClocks,
  commitTableAdvance,
  prepareVenuePersistence,
  rooms,
  tableSessionKey,
} from './game-ops'

vi.mock('./venue-library-db', () => ({
  loadVenueLibraries: async () => new Map(),
  persistVenueLibraries: async () => {},
}))

const toasts: string[] = []

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
  clearAnswerRevealClocks()
  vi.useRealTimers()
})

function answering(venue: string, players: GameState['players']): string {
  let gs = createEmptyGame(venue, 'host', '1')
  gs = addPlayer(gs, 'ada', 'Ada', 500)
  gs = addPlayer(gs, 'bo', 'Bo', 500)
  gs = addPlayer(gs, 'cara', 'Cara', 0)
  const key = tableSessionKey(venue, '1')
  rooms.set(key, {
    ...gs,
    phase: 'answering',
    players,
    round: {
      ...gs.round,
      answerDeadline: 1_045_000,
      question: { id: 'q', text: '?', answer: 10 },
    },
  })
  return key
}

describe('answer reveals itself', () => {
  it('waits for a points-only player, then warns for 5 seconds', async () => {
    let gs = createEmptyGame('RV', 'host', '1')
    gs = addPlayer(gs, 'ada', 'Ada', 500)
    gs = addPlayer(gs, 'cara', 'Cara', 0)
    const key = answering('RV', [
      { ...gs.players[0]!, hand: [{ digit: 1 }, { digit: 2 }] as never, submittedAnswer: 10 },
      { ...gs.players[1]!, pointsOnly: true, hand: [{ digit: 3 }, { digit: 4 }] as never },
    ])

    commitTableAdvance(key, rooms.get(key)!, rooms.get(key)!)
    expect(rooms.get(key)!.phase).toBe('answering')
    expect(rooms.get(key)!.round.answerRevealAt).toBeUndefined()

    const locked = {
      ...rooms.get(key)!,
      players: rooms.get(key)!.players.map((player) =>
        player.id === 'cara' ? { ...player, submittedAnswer: 12 } : player,
      ),
    }
    commitTableAdvance(key, rooms.get(key)!, locked)

    expect(rooms.get(key)!.phase).toBe('answering')
    expect(rooms.get(key)!.round.answerRevealAt).toBe(1_000_000 + ANSWER_REVEAL_WARNING_MS)
    expect(toasts).toContain(answerRevealWarning(5))

    await vi.advanceTimersByTimeAsync(ANSWER_REVEAL_WARNING_MS)
    expect(rooms.get(key)!.phase).toBe('showdown')
  })

  it('forfeits whoever is still open when the guide hits zero, then warns', async () => {
    let gs = createEmptyGame('RZ', 'host', '1')
    gs = addPlayer(gs, 'ada', 'Ada', 500)
    gs = addPlayer(gs, 'bo', 'Bo', 500)
    const key = answering('RZ', [
      { ...gs.players[0]!, hand: [{ digit: 1 }, { digit: 2 }] as never, submittedAnswer: 10 },
      { ...gs.players[1]!, hand: [{ digit: 3 }, { digit: 4 }] as never },
    ])
    rooms.set(key, {
      ...rooms.get(key)!,
      round: { ...rooms.get(key)!.round, answerDeadline: 1_000_000 },
    })

    commitTableAdvance(key, rooms.get(key)!, rooms.get(key)!)
    const bo = rooms.get(key)!.players.find((player) => player.id === 'bo')
    expect(bo?.answerForfeited).toBe(true)
    expect(rooms.get(key)!.phase).toBe('answering')
    expect(toasts).toContain('The answer reveals in 5 seconds.')

    await vi.advanceTimersByTimeAsync(5_000)
    expect(rooms.get(key)!.phase).toBe('showdown')
  })

  it('warns immediately when guessing opens and every guess is already locked', () => {
    let gs = createEmptyGame('RP', 'host', '1')
    gs = addPlayer(gs, 'ada', 'Ada', 500)
    gs = addPlayer(gs, 'cara', 'Cara', 0)
    const key = answering('RP', [
      { ...gs.players[0]!, hand: [{ digit: 1 }, { digit: 2 }] as never, submittedAnswer: 10 },
      { ...gs.players[1]!, pointsOnly: true, hand: [{ digit: 3 }, { digit: 4 }] as never, submittedAnswer: 12 },
    ])
    closeGuessingIfReady('RP')
    expect(rooms.get(key)!.phase).toBe('answering')
    expect(rooms.get(key)!.round.answerRevealAt).toBe(1_000_000 + ANSWER_REVEAL_WARNING_MS)
    expect(toasts).toContain('The answer reveals in 5 seconds.')
  })

  it('closes a guide that already ran out even when the timer was missed', () => {
    let gs = createEmptyGame('RM', 'host', '1')
    gs = addPlayer(gs, 'ada', 'Ada', 500)
    gs = addPlayer(gs, 'bo', 'Bo', 500)
    const key = answering('RM', [
      { ...gs.players[0]!, hand: [{ digit: 1 }, { digit: 2 }] as never, submittedAnswer: 10 },
      { ...gs.players[1]!, hand: [{ digit: 3 }, { digit: 4 }] as never },
    ])
    rooms.set(key, {
      ...rooms.get(key)!,
      round: { ...rooms.get(key)!.round, answerDeadline: 1_000_000 },
    })
    sweepAnswerWindows(1_000_000)
    const after = rooms.get(key)!
    expect(after.players.find((player) => player.id === 'bo')?.answerForfeited).toBe(true)
    expect(after.round.answerRevealAt).toBe(1_000_000 + ANSWER_REVEAL_WARNING_MS)
    expect(after.phase).toBe('answering')
  })

  it('closes on its own when the guide runs out and nobody sends another action', async () => {
    let gs = createEmptyGame('RQ', 'host', '1')
    gs = addPlayer(gs, 'bo', 'Bo', 500)
    const key = answering('RQ', [{ ...gs.players[0]!, hand: [{ digit: 1 }, { digit: 2 }] as never }])
    rooms.set(key, {
      ...rooms.get(key)!,
      round: { ...rooms.get(key)!.round, answerDeadline: 1_005_000 },
    })
    beginAnswerWindow('RQ', 1_005_000)

    await vi.advanceTimersByTimeAsync(4_999)
    expect(rooms.get(key)!.phase).toBe('answering')
    expect(rooms.get(key)!.round.answerRevealAt).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    expect(rooms.get(key)!.round.answerRevealAt).toBe(1_005_000 + ANSWER_REVEAL_WARNING_MS)
    expect(rooms.get(key)!.players[0]?.answerForfeited).toBe(true)

    await vi.advanceTimersByTimeAsync(ANSWER_REVEAL_WARNING_MS)
    expect(rooms.get(key)!.phase).toBe('showdown')
  })
})
