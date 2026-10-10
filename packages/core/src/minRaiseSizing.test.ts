import { describe, expect, it } from 'vitest'
import {
  minRaiseByAmount,
  openBettingRound1,
  playerCall,
  playerRaise,
  SAMPLE_QUESTIONS,
  createEmptyGame,
} from './index'

describe('NLHE min-raise sizing', () => {
  it('opens at the big blind and grows with each full raise', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = {
      ...gs,
      smallBlind: 10,
      bigBlind: 20,
      phase: 'question',
      players: [
        { id: 'a', name: 'A', bankroll: 1000, hand: [{ digit: 1 }, { digit: 2 }], hasFolded: false, isAllIn: false },
        { id: 'b', name: 'B', bankroll: 1000, hand: [{ digit: 3 }, { digit: 4 }], hasFolded: false, isAllIn: false },
        { id: 'c', name: 'C', bankroll: 1000, hand: [{ digit: 5 }, { digit: 6 }], hasFolded: false, isAllIn: false },
      ],
      round: {
        ...gs.round,
        question: SAMPLE_QUESTIONS[0]!,
        dealerIndex: 0,
      },
    }

    gs = openBettingRound1(gs)
    expect(minRaiseByAmount(gs)).toBe(20)
    expect(gs.round.lastFullRaiseAmount).toBe(20)

    // UTG (seat 0 after BB) raises by 40 → bet level 60
    expect(gs.round.currentPlayerIndex).toBe(0)
    gs = playerRaise(gs, 'a', 40)
    expect(gs.round.currentBet).toBe(60)
    expect(minRaiseByAmount(gs)).toBe(40)

    // SB must raise by at least 40 (to 100+)
    expect(gs.round.currentPlayerIndex).toBe(1)
    const rejected = playerRaise(gs, 'b', 20)
    expect(rejected.round.currentBet).toBe(60)
    expect(rejected.round.currentPlayerIndex).toBe(1)

    gs = playerRaise(gs, 'b', 40)
    expect(gs.round.currentBet).toBe(100)
    expect(minRaiseByAmount(gs)).toBe(40)

    gs = playerCall(gs, 'c')
    expect(gs.round.currentPlayerIndex).toBe(0)
  })
})
