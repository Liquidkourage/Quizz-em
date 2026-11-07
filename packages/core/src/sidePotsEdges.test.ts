import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, payoutHandWithSidePots, previewChipPayoutByPlayerId } from './index'
import type { GameState } from './index'

/**
 * Edges of the hand payout: odd chips, ties, and several all-in levels at once.
 * Money rule throughout: chips are only moved, never created or lost.
 */

type Seat = {
  id: string
  /** What the player still holds after putting their share in the pot. */
  bankroll: number
  /** Chips this player put into the pot this hand. */
  put: number
  answer?: number
  folded?: boolean
}

const CORRECT = 100

function showdown(seats: readonly Seat[]): GameState {
  let gs = createEmptyGame('V', 'h')
  for (const seat of seats) gs = addPlayer(gs, seat.id, seat.id.toUpperCase(), seat.bankroll)
  return {
    ...gs,
    phase: 'showdown',
    round: {
      ...gs.round,
      pot: seats.reduce((sum, seat) => sum + seat.put, 0),
      handContributions: Object.fromEntries(seats.map((seat) => [seat.id, seat.put])),
      question: { id: 'q', text: '?', answer: CORRECT },
    },
    players: gs.players.map((player, i) => ({
      ...player,
      submittedAnswer: seats[i]!.answer,
      hasFolded: seats[i]!.folded === true,
    })),
  }
}

const wealth = (gs: GameState) => gs.players.reduce((sum, p) => sum + p.bankroll, 0) + gs.round.pot
const bankroll = (gs: GameState, id: string) => gs.players.find((p) => p.id === id)!.bankroll

describe('odd chips and ties', () => {
  it('gives the extra chip to the first tied winner in seat order', () => {
    // 99 in the pot, a and b tie 10 away from the answer, c is far off.
    const gs = showdown([
      { id: 'a', bankroll: 967, put: 33, answer: 90 },
      { id: 'b', bankroll: 967, put: 33, answer: 110 },
      { id: 'c', bankroll: 967, put: 33, answer: 500 },
    ])
    const paid = payoutHandWithSidePots(gs)
    expect(bankroll(paid, 'a')).toBe(967 + 50)
    expect(bankroll(paid, 'b')).toBe(967 + 49)
    expect(bankroll(paid, 'c')).toBe(967)
    expect(wealth(paid)).toBe(wealth(gs))
    expect(paid.round.pot).toBe(0)
  })

  it('spreads one leftover chip over a three-way tie', () => {
    const gs = showdown([
      { id: 'a', bankroll: 975, put: 25, answer: 90 },
      { id: 'b', bankroll: 975, put: 25, answer: 110 },
      { id: 'c', bankroll: 975, put: 25, answer: 90 },
      { id: 'd', bankroll: 975, put: 25, answer: 900 },
    ])
    const paid = payoutHandWithSidePots(gs)
    expect([bankroll(paid, 'a'), bankroll(paid, 'b'), bankroll(paid, 'c')]).toEqual([975 + 34, 975 + 33, 975 + 33])
    expect(bankroll(paid, 'd')).toBe(975)
    expect(wealth(paid)).toBe(wealth(gs))
  })

  it('splits an odd side pot among tied winners while a different player takes the main pot', () => {
    // s is short and closest, so s takes the 40 main pot. The 93 side pot is a tie between a and b.
    const gs = showdown([
      { id: 's', bankroll: 0, put: 10, answer: 100 },
      { id: 'a', bankroll: 0, put: 41, answer: 120 },
      { id: 'b', bankroll: 0, put: 41, answer: 80 },
      { id: 'c', bankroll: 0, put: 41, answer: 700 },
    ])
    const paid = payoutHandWithSidePots(gs)
    expect(bankroll(paid, 's')).toBe(40)
    expect(bankroll(paid, 'a')).toBe(47)
    expect(bankroll(paid, 'b')).toBe(46)
    expect(bankroll(paid, 'c')).toBe(0)
    expect(wealth(paid)).toBe(wealth(gs))
  })
})

describe('several all-in levels at once', () => {
  const stacks = (answers: [number, number, number, number]) =>
    showdown([
      { id: 'p1', bankroll: 0, put: 100, answer: answers[0] },
      { id: 'p2', bankroll: 0, put: 200, answer: answers[1] },
      { id: 'p3', bankroll: 0, put: 300, answer: answers[2] },
      { id: 'p4', bankroll: 0, put: 400, answer: answers[3] },
    ])

  it('pays every layer to the closest answer among the players who can win it', () => {
    // Layers: 400 main (all four), 300 (p2 to p4), 200 (p3, p4), and 100 uncalled back to p4.
    const gs = stacks([100, 101, 102, 103])
    const paid = payoutHandWithSidePots(gs)
    expect(bankroll(paid, 'p1')).toBe(400)
    expect(bankroll(paid, 'p2')).toBe(300)
    expect(bankroll(paid, 'p3')).toBe(200)
    expect(bankroll(paid, 'p4')).toBe(100)
    expect(wealth(paid)).toBe(1000)
  })

  it('lets the biggest stack take everything when its answer is closest', () => {
    const gs = stacks([103, 102, 101, 100])
    const paid = payoutHandWithSidePots(gs)
    expect(bankroll(paid, 'p4')).toBe(1000)
    for (const id of ['p1', 'p2', 'p3']) expect(bankroll(paid, id)).toBe(0)
  })

  it('previews exactly what the payout will do', () => {
    const gs = stacks([100, 101, 102, 103])
    expect(previewChipPayoutByPlayerId(gs)).toEqual({ p1: 400, p2: 300, p3: 200, p4: 100 })
  })

  it('keeps a folded player’s chips in the pots without letting them win', () => {
    const gs = showdown([
      { id: 'f', bankroll: 0, put: 150, answer: 100, folded: true },
      { id: 'a', bankroll: 0, put: 100, answer: 130 },
      { id: 'b', bankroll: 0, put: 300, answer: 120 },
    ])
    const paid = payoutHandWithSidePots(gs)
    expect(bankroll(paid, 'f')).toBe(0)
    // 100 matched by all three is the main pot (300) and goes to the closer of a and b: b.
    // Layer 100 to 150 has f's 50 and b's 50; only b is left to win it. Layer 150 to 300 is uncalled.
    expect(bankroll(paid, 'a')).toBe(0)
    expect(bankroll(paid, 'b')).toBe(550)
    expect(wealth(paid)).toBe(550)
  })
})

/** Small seeded generator so a failing hand can be replayed. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('a random sweep of hands', () => {
  it('never creates or loses chips, whatever the stacks, folds and answers', () => {
    const rand = seeded(20261107)
    const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))
    for (let hand = 0; hand < 400; hand++) {
      const count = int(2, 7)
      const seats: Seat[] = []
      for (let i = 0; i < count; i++) {
        seats.push({
          id: `p${i}`,
          bankroll: int(0, 600),
          put: rand() < 0.2 ? 0 : int(1, 500),
          answer: rand() < 0.15 ? undefined : int(0, 200),
          folded: rand() < 0.3,
        })
      }
      const gs = showdown(seats)
      const before = wealth(gs)
      const paid = payoutHandWithSidePots(gs)
      const label = `hand ${hand} ${JSON.stringify(seats)}`
      expect(wealth(paid), label).toBe(before)
      expect(paid.round.pot, label).toBe(0)
      for (const player of paid.players) expect(player.bankroll, label).toBeGreaterThanOrEqual(0)
    }
  })
})
