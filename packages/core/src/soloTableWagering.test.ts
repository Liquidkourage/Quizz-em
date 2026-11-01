import { describe, expect, it } from 'vitest'
import {
  createEmptyGame,
  dealCommunityCards,
  dealInitialCards,
  openBettingRound1,
  SAMPLE_QUESTIONS,
} from './index'

describe('solo table wagering', () => {
  it('does not open wagering when only one player can still win the chips', () => {
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
    expect(gs.phase).toBe('betting')
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.currentPlayerIndex).toBe(-1)
    expect(gs.round.pot).toBe(0)
    expect(gs.players[0]!.bankroll).toBe(1000)
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

  it('does not reopen wagering after the board when everyone else has folded', () => {
    let gs = createEmptyGame('HOST01', '', '1')
    gs = {
      ...gs,
      phase: 'betting',
      players: [
        {
          id: 'winner',
          name: 'Ada',
          bankroll: 900,
          hand: [{ digit: 1 }, { digit: 2 }],
          hasFolded: false,
          isAllIn: false,
        },
        {
          id: 'folded',
          name: 'Bea',
          bankroll: 800,
          hand: [{ digit: 3 }, { digit: 4 }],
          hasFolded: true,
          isAllIn: false,
        },
      ],
      round: {
        ...gs.round,
        question: SAMPLE_QUESTIONS[0]!,
        bettingRound: 1,
        isBettingOpen: false,
        currentPlayerIndex: -1,
        communityCards: [],
      },
    }
    gs = dealCommunityCards(gs)
    expect(gs.round.communityCards).toHaveLength(5)
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.currentPlayerIndex).toBe(-1)
  })
})
