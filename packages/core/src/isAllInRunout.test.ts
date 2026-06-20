import { describe, expect, it } from 'vitest'
import { createEmptyGame, isAllInRunout, type GameState } from './index'

function runoutTable(): GameState {
  const base = createEmptyGame('V', '', '1')
  return {
    ...base,
    phase: 'betting',
    players: [
      { id: 'a', name: 'A', bankroll: 0, hand: [], hasFolded: false, isAllIn: true },
      { id: 'b', name: 'B', bankroll: 0, hand: [], hasFolded: false, isAllIn: true },
      { id: 'c', name: 'C', bankroll: 0, hand: [], hasFolded: true, isAllIn: false },
    ],
    round: {
      ...base.round,
      bettingRound: 2,
      communityCards: [
        { digit: 1 },
        { digit: 2 },
        { digit: 3 },
        { digit: 4 },
        { digit: 5 },
      ],
      isBettingOpen: false,
      currentPlayerIndex: -1,
    },
  }
}

describe('isAllInRunout', () => {
  it('is true when the board is out and every contestant is all-in', () => {
    expect(isAllInRunout(runoutTable())).toBe(true)
  })

  it('is false while wagering is still open', () => {
    const gs = {
      ...runoutTable(),
      round: { ...runoutTable().round, isBettingOpen: true, currentPlayerIndex: 0 },
      players: [
        { id: 'a', name: 'A', bankroll: 100, hand: [], hasFolded: false, isAllIn: false },
        { id: 'b', name: 'B', bankroll: 0, hand: [], hasFolded: false, isAllIn: true },
      ],
    }
    expect(isAllInRunout(gs)).toBe(false)
  })

  it('is false when one contestant can still act', () => {
    const gs = runoutTable()
    gs.players[0] = { ...gs.players[0]!, bankroll: 50, isAllIn: false }
    expect(isAllInRunout(gs)).toBe(false)
  })

  it('is false when only one player remains', () => {
    const gs = runoutTable()
    gs.players = [{ id: 'a', name: 'A', bankroll: 0, hand: [], hasFolded: false, isAllIn: true }]
    expect(isAllInRunout(gs)).toBe(false)
  })
})
