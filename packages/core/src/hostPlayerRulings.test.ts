import { describe, expect, it } from 'vitest'
import {
  addPlayer,
  createEmptyGame,
  endRound,
  excuseGuess,
  forfeitOpenGuesses,
  playerRaise,
  replaceLockedGuess,
  undoLastChipMove,
  type GameState,
} from './index'

function bettingTable(): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'ada', 'Ada', 500)
  gs = addPlayer(gs, 'bo', 'Bo', 500)
  return {
    ...gs,
    phase: 'betting',
    bigBlind: 20,
    round: {
      ...gs.round,
      isBettingOpen: true,
      currentPlayerIndex: 0,
      currentBet: 0,
      lastFullRaiseAmount: 20,
      pot: 0,
    },
  }
}

function guessingTable(): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'ada', 'Ada', 500)
  gs = addPlayer(gs, 'bo', 'Bo', 500)
  return {
    ...gs,
    phase: 'answering',
    round: {
      ...gs.round,
      pot: 40,
      handContributions: { ada: 20, bo: 20 },
      question: { id: 'q', text: '?', answer: 10 },
    },
  }
}

describe('host rulings on one player', () => {
  it('returns the last bet and gives that player the turn', () => {
    const raised = playerRaise(bettingTable(), 'ada', 20)
    expect(raised.players[0]!.bankroll).toBe(480)
    expect(raised.round.pot).toBe(20)
    const back = undoLastChipMove(raised, 'ada')
    expect(back.players[0]!.bankroll).toBe(500)
    expect(back.round.pot).toBe(0)
    expect(back.round.currentPlayerIndex).toBe(0)
    expect(back.round.isBettingOpen).toBe(true)
    expect(undoLastChipMove(back, 'ada')).toBe(back)
  })

  it('replaces a locked guess', () => {
    const locked = replaceLockedGuess(guessingTable(), 'ada', 14)
    expect(locked.players.find((p) => p.id === 'ada')!.submittedAnswer).toBe(14)
  })

  it('lets an excused player sit out the question', () => {
    const excused = excuseGuess(guessingTable(), 'bo')
    const nudged = forfeitOpenGuesses(excused)
    expect(nudged.players.find((p) => p.id === 'bo')!.answerForfeited).not.toBe(true)
    const adaAnswered = {
      ...nudged,
      phase: 'showdown' as const,
      players: nudged.players.map((p) => (p.id === 'ada' ? { ...p, submittedAnswer: 10 } : p)),
    }
    const paid = endRound(adaAnswered)
    const bo = paid.players.find((p) => p.id === 'bo')!
    const ada = paid.players.find((p) => p.id === 'ada')!
    expect(bo.answerPoints ?? 0).toBe(0)
    expect(bo.bankroll).toBe(500)
    expect(ada.bankroll).toBe(540)
  })
})
