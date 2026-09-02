import { describe, expect, it } from 'vitest'
import {
  addPlayer,
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
