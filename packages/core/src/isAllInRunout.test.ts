import { describe, expect, it } from 'vitest'
import { canPreloadTriviaAnswer, createEmptyGame, isAllInRunout, mayLockGuess, type GameState } from './index'

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

const fiveBoard: GameState['round']['communityCards'] = [
  { digit: 1 },
  { digit: 2 },
  { digit: 3 },
  { digit: 4 },
  { digit: 5 },
]

function bettingWithBoard(): GameState {
  const base = createEmptyGame('V', '', '1')
  return {
    ...base,
    phase: 'betting',
    players: [
      { id: 'live', name: 'Live', bankroll: 400, hand: [], hasFolded: false, isAllIn: false },
      { id: 'bust', name: 'Bust', bankroll: 0, hand: [], hasFolded: false, isAllIn: false, pointsOnly: true },
      { id: 'fold', name: 'Fold', bankroll: 200, hand: [], hasFolded: true, isAllIn: false },
      { id: 'allin', name: 'Allin', bankroll: 0, hand: [], hasFolded: false, isAllIn: true },
    ],
    round: {
      ...base.round,
      bettingRound: 2,
      communityCards: fiveBoard,
      isBettingOpen: true,
      currentPlayerIndex: 0,
    },
  }
}

describe('mayLockGuess', () => {
  it('lets a player who is out of the pot lock a guess once the board is out', () => {
    const gs = bettingWithBoard()
    const bust = gs.players[1]!
    const folded = gs.players[2]!
    const allIn = gs.players[3]!
    const live = gs.players[0]!
    expect(mayLockGuess(gs, bust)).toBe(true)
    expect(mayLockGuess(gs, folded)).toBe(true)
    expect(mayLockGuess(gs, allIn)).toBe(true)
    expect(mayLockGuess(gs, live)).toBe(false)
  })

  it('stays closed until the five community cards are out', () => {
    const gs = bettingWithBoard()
    gs.round = { ...gs.round, communityCards: fiveBoard.slice(0, 3) }
    expect(mayLockGuess(gs, gs.players[1]!)).toBe(false)
  })

  it('opens for the live bettor once the table is answering', () => {
    const gs = bettingWithBoard()
    gs.phase = 'answering'
    expect(mayLockGuess(gs, gs.players[0]!)).toBe(true)
  })
})

describe('canPreloadTriviaAnswer', () => {
  it('is true once the all-in board is complete', () => {
    expect(canPreloadTriviaAnswer(runoutTable())).toBe(true)
  })

  it('stays closed until the five community cards are out', () => {
    const gs = runoutTable()
    gs.round = { ...gs.round, communityCards: [], bettingRound: 1 }
    expect(isAllInRunout(gs)).toBe(true)
    expect(canPreloadTriviaAnswer(gs)).toBe(false)
  })
})
