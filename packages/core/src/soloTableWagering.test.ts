import { describe, expect, it } from 'vitest'
import {
  createEmptyGame,
  openBettingRound1,
  playerCheck,
  SAMPLE_QUESTIONS,
} from './index'

describe('solo table wagering', () => {
  it('closes round 1 after the lone player checks (both blinds on one seat)', () => {
    let gs = createEmptyGame('HOST01', '', '1')
    gs = {
      ...gs,
      smallBlind: 10,
      bigBlind: 20,
      phase: 'question',
      players: [
        {
          id: 'p1',
          name: 'Jay B.',
          bankroll: 1000,
          hand: [{ digit: 2 }, { digit: 5 }],
          hasFolded: false,
          isAllIn: false,
        },
      ],
      round: {
        ...gs.round,
        question: SAMPLE_QUESTIONS[0]!,
        dealerIndex: 0,
      },
    }

    gs = openBettingRound1(gs)
    expect(gs.round.isBettingOpen).toBe(true)
    expect(gs.round.currentPlayerIndex).toBe(0)
    expect(gs.round.playerBets?.p1).toBe(30)

    gs = playerCheck(gs, 'p1')
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.currentPlayerIndex).toBe(-1)
    expect(gs.round.lastSeatBettingAction?.[0]).toBe('check')
  })
})
