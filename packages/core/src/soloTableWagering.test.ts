import { describe, expect, it } from 'vitest'
import {
  createEmptyGame,
  dealCommunityCards,
  dealInitialCards,
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

  it('does not make the last chip stack bet against a points-only seat', () => {
    let gs = createEmptyGame('HOST01', '', '1')
    gs = {
      ...gs,
      smallBlind: 10,
      bigBlind: 20,
      phase: 'question',
      players: [
        {
          id: 'chip',
          name: 'Ada',
          bankroll: 2000,
          hand: [],
          hasFolded: false,
          isAllIn: false,
          pointsOnly: false,
        },
        {
          id: 'busted',
          name: 'Bea',
          bankroll: 0,
          hand: [],
          hasFolded: false,
          isAllIn: false,
          pointsOnly: true,
        },
      ],
      round: {
        ...gs.round,
        question: SAMPLE_QUESTIONS[0]!,
        dealerIndex: 0,
      },
    }

    gs = dealInitialCards(gs)
    expect(gs.phase).toBe('betting')
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.pot).toBe(0)
    expect(gs.players.find((p) => p.id === 'chip')!.bankroll).toBe(2000)
    expect(gs.players.find((p) => p.id === 'chip')!.hand).toHaveLength(2)
    expect(gs.players.find((p) => p.id === 'busted')!.hand).toHaveLength(2)

    gs = dealCommunityCards(gs)
    expect(gs.round.communityCards).toHaveLength(5)
    expect(gs.round.bettingRound).toBe(2)
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.currentPlayerIndex).toBe(-1)
  })
})
