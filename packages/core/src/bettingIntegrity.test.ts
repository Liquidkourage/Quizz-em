import { describe, expect, it } from 'vitest'
import {
  addPlayer,
  adminAdvanceTurn,
  createEmptyGame,
  endRound,
  openBettingRound1,
  placeBet,
  playerCall,
  playerCheck,
  SAMPLE_QUESTIONS,
} from './index'

describe('isBettingComplete / BB option', () => {
  it('keeps the street open for the big blind after limps', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = {
      ...gs,
      smallBlind: 10,
      bigBlind: 20,
      phase: 'question',
      players: [
        { id: 'btn', name: 'Btn', bankroll: 1000, hand: [{ digit: 1 }, { digit: 2 }], hasFolded: false, isAllIn: false },
        { id: 'sb', name: 'Sb', bankroll: 1000, hand: [{ digit: 3 }, { digit: 4 }], hasFolded: false, isAllIn: false },
        { id: 'bb', name: 'Bb', bankroll: 1000, hand: [{ digit: 5 }, { digit: 6 }], hasFolded: false, isAllIn: false },
      ],
      round: {
        ...gs.round,
        question: SAMPLE_QUESTIONS[0]!,
        dealerIndex: 0,
      },
    }

    gs = openBettingRound1(gs)
    // UTG / button acts first (seat after BB)
    expect(gs.round.currentPlayerIndex).toBe(0)
    gs = playerCall(gs, 'btn')
    expect(gs.round.isBettingOpen).toBe(true)
    gs = playerCall(gs, 'sb')
    expect(gs.round.isBettingOpen).toBe(true)
    expect(gs.round.currentPlayerIndex).toBe(2)
    // BB still to act — must not auto-close after limps
    expect(gs.players[2]!.id).toBe('bb')

    gs = playerCheck(gs, 'bb')
    expect(gs.round.isBettingOpen).toBe(false)
  })
})

describe('adminAdvanceTurn', () => {
  it('folds the player who must act instead of passing the turn', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = addPlayer(gs, 'a', 'Ada', 1000)
    gs = addPlayer(gs, 'b', 'Bea', 1000)
    gs = {
      ...gs,
      phase: 'betting',
      players: gs.players.map((p) => ({
        ...p,
        hand: [{ digit: 1 }, { digit: 2 }],
        hasFolded: false,
        isAllIn: false,
      })),
      round: {
        ...gs.round,
        pot: 30,
        currentBet: 20,
        playerBets: { a: 10, b: 20 },
        isBettingOpen: true,
        currentPlayerIndex: 0,
        lastSeatBettingAction: [null, null],
      },
    }
    const pot = gs.round.pot
    const bank = gs.players[0]!.bankroll
    gs = adminAdvanceTurn(gs)
    expect(gs.players[0]!.hasFolded).toBe(true)
    expect(gs.players[0]!.hand).toEqual([{ digit: 1 }, { digit: 2 }])
    expect(gs.players[0]!.bankroll).toBe(bank)
    expect(gs.round.pot).toBe(pot)
    expect(gs.round.lastSeatBettingAction?.[0]).toBe('fold')
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.currentPlayerIndex).toBe(-1)
    expect(gs.players[1]!.hasFolded).toBe(false)
    expect(gs.players[1]!.bankroll).toBe(1000)
  })

  it('still moves the turn when another player remains in the chips', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = addPlayer(gs, 'a', 'Ada', 1000)
    gs = addPlayer(gs, 'b', 'Bea', 1000)
    gs = addPlayer(gs, 'c', 'Cy', 1000)
    gs = {
      ...gs,
      phase: 'betting',
      players: gs.players.map((p) => ({
        ...p,
        hand: [{ digit: 1 }, { digit: 2 }],
        hasFolded: false,
        isAllIn: false,
      })),
      round: {
        ...gs.round,
        pot: 30,
        currentBet: 20,
        playerBets: { a: 10, b: 0, c: 20 },
        isBettingOpen: true,
        currentPlayerIndex: 0,
        lastSeatBettingAction: [null, null, null],
      },
    }
    gs = adminAdvanceTurn(gs)
    expect(gs.players[0]!.hasFolded).toBe(true)
    expect(gs.round.isBettingOpen).toBe(true)
    expect(gs.round.currentPlayerIndex).toBe(1)
    expect(gs.players[1]!.hasFolded).toBe(false)
  })

  it('closes the street when that fold leaves nobody who can act', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = addPlayer(gs, 'a', 'Ada', 1000)
    gs = addPlayer(gs, 'b', 'Bea', 1000)
    gs = {
      ...gs,
      phase: 'betting',
      players: [
        { ...gs.players[0]!, hasFolded: false, isAllIn: false },
        { ...gs.players[1]!, hasFolded: true, isAllIn: false },
      ],
      round: {
        ...gs.round,
        isBettingOpen: true,
        currentPlayerIndex: 0,
        currentBet: 0,
        lastSeatBettingAction: [null, 'fold'],
      },
    }
    gs = adminAdvanceTurn(gs)
    expect(gs.players[0]!.hasFolded).toBe(true)
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.currentPlayerIndex).toBe(-1)
  })
})

describe('placeBet stack cap', () => {
  it('never adds more chips to the pot than the player has', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'a', 'A', 50)
    gs = {
      ...gs,
      phase: 'betting',
      round: { ...gs.round, pot: 0, playerBets: {}, handContributions: {}, isBettingOpen: true },
    }
    gs = placeBet(gs, 'a', 500)
    expect(gs.players[0]!.bankroll).toBe(0)
    expect(gs.round.pot).toBe(50)
    expect(gs.round.playerBets!.a).toBe(50)
  })
})

describe('endRound points-only + dealer', () => {
  it('keeps busted players as pointsOnly and advances dealer on the surviving roster', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'a', 'A', 0)
    gs = addPlayer(gs, 'b', 'B', 500)
    gs = addPlayer(gs, 'c', 'C', 500)
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 100,
        dealerIndex: 2,
        question: { id: 'q', text: '?', answer: 42 },
        handContributions: { a: 0, b: 50, c: 50 },
      },
      players: [
        { ...gs.players[0]!, bankroll: 0, submittedAnswer: 42, hasFolded: false },
        { ...gs.players[1]!, submittedAnswer: 40, hasFolded: false },
        { ...gs.players[2]!, submittedAnswer: 99, hasFolded: false },
      ],
    }

    gs = endRound(gs)
    expect(gs.phase).toBe('lobby')
    expect(gs.players).toHaveLength(3)
    expect(gs.players.find((p) => p.id === 'a')!.pointsOnly).toBe(true)
    expect(gs.players.find((p) => p.id === 'a')!.bankroll).toBe(0)
    expect(gs.players.find((p) => p.id === 'a')!.answerPoints).toBe(100)
    expect(gs.players.find((p) => p.id === 'b')!.pointsOnly).toBeFalsy()
    // dealer was 2 → next is (2+1) % 3 = 0
    expect(gs.round.dealerIndex).toBe(0)
  })

  it('does not award chip pot to points-only even with the closest answer', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'a', 'A', 0)
    gs = addPlayer(gs, 'b', 'B', 500)
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 100,
        question: { id: 'q', text: '?', answer: 42 },
        handContributions: { b: 100 },
      },
      players: [
        {
          ...gs.players[0]!,
          pointsOnly: true,
          bankroll: 0,
          submittedAnswer: 42,
          hasFolded: false,
          answerPoints: 0,
        },
        { ...gs.players[1]!, submittedAnswer: 50, hasFolded: false },
      ],
    }
    gs = endRound(gs)
    expect(gs.players.find((p) => p.id === 'a')!.pointsOnly).toBe(true)
    expect(gs.players.find((p) => p.id === 'a')!.bankroll).toBe(0)
    expect(gs.players.find((p) => p.id === 'b')!.bankroll).toBe(600)
  })
})
