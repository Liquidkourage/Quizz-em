import { describe, expect, it } from 'vitest'
import {
  minRaiseByAmount,
  openBettingRound1,
  playerAllIn,
  playerCall,
  playerRaise,
  SAMPLE_QUESTIONS,
  createEmptyGame,
  type GameState,
  type PlayerState,
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

  it('keeps a short all-in from reopening a raise for someone who already acted', () => {
    let gs = createEmptyGame('V', 'h', '1')
    gs = {
      ...gs,
      smallBlind: 10,
      bigBlind: 20,
      phase: 'question',
      players: [
        { id: 'a', name: 'A', bankroll: 1000, hand: [{ digit: 1 }, { digit: 2 }], hasFolded: false, isAllIn: false },
        { id: 'b', name: 'B', bankroll: 70, hand: [{ digit: 3 }, { digit: 4 }], hasFolded: false, isAllIn: false },
        { id: 'c', name: 'C', bankroll: 1000, hand: [{ digit: 5 }, { digit: 6 }], hasFolded: false, isAllIn: false },
      ],
      round: { ...gs.round, question: SAMPLE_QUESTIONS[0]!, dealerIndex: 0 },
    }
    gs = openBettingRound1(gs)
    gs = playerRaise(gs, 'a', 40)
    gs = playerAllIn(gs, 'b')
    expect(gs.round.currentBet).toBe(70)
    expect(gs.round.lastFullRaiseAmount).toBe(40)

    const raisedOver = playerRaise(gs, 'c', 40)
    expect(raisedOver.round.currentBet).toBe(110)
    expect(raisedOver.round.lastFullRaiseAmount).toBe(40)

    gs = playerCall(gs, 'c')
    const bankroll = gs.players[0]!.bankroll
    const reopened = playerRaise(gs, 'a', 40)
    expect(reopened.round.currentBet).toBe(70)
    expect(reopened.round.currentPlayerIndex).toBe(0)
    const called = playerAllIn(gs, 'a')
    expect(called.round.currentBet).toBe(70)
    expect(called.players[0]!.bankroll).toBe(bankroll - 10)
  })

  it('reopens a raise once short all-ins add up to the last full raise', () => {
    const seat = (id: string, bankroll: number, isAllIn = false): PlayerState => ({
      id,
      name: id,
      bankroll,
      hand: [],
      hasFolded: false,
      isAllIn,
    })
    let gs = createEmptyGame('V', 'h', '1')
    gs = {
      ...gs,
      bigBlind: 500,
      smallBlind: 250,
      phase: 'betting',
      players: [seat('a', 5000), seat('b', 5000), seat('c', 0, true), seat('d', 0, true)],
      round: {
        ...gs.round,
        isBettingOpen: true,
        currentPlayerIndex: 1,
        currentBet: 1700,
        playerBets: { a: 500, b: 1000, c: 1300, d: 1700 },
        lastFullRaiseAmount: 500,
        lastSeatBettingAction: ['raise', 'raise', 'allIn', 'allIn'],
      },
    } satisfies GameState
    const raised = playerRaise(gs, 'b', 500)
    expect(raised.round.currentBet).toBe(2200)
    expect(raised.round.lastFullRaiseAmount).toBe(500)

    const shortOnly: GameState = {
      ...gs,
      round: {
        ...gs.round,
        currentBet: 1300,
        playerBets: { a: 500, b: 1000, c: 1300 },
        lastSeatBettingAction: ['raise', 'raise', 'allIn', null],
      },
    }
    expect(playerRaise(shortOnly, 'b', 500)).toBe(shortOnly)
    const bankroll = shortOnly.players[1]!.bankroll
    const called = playerAllIn(shortOnly, 'b')
    expect(called.round.currentBet).toBe(1300)
    expect(called.players[1]!.bankroll).toBe(bankroll - 300)
  })
})
