import { describe, expect, it } from 'vitest'
import {
  addPlayer,
  createEmptyGame,
  endRound,
  forfeitOpenGuesses,
  submitAnswer,
  type GameState,
} from './index'

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
    players: [
      { ...gs.players[0]!, submittedAnswer: 10 },
      { ...gs.players[1]! },
    ],
  }
}

describe('forfeit an open guess', () => {
  it('locks out a seat that never guessed and leaves a locked guess alone', () => {
    const next = forfeitOpenGuesses(guessingTable())
    expect(next.players.find((p) => p.id === 'ada')!.answerForfeited).not.toBe(true)
    expect(next.players.find((p) => p.id === 'bo')!.answerForfeited).toBe(true)
    expect(submitAnswer(next, 'bo', 9)).toBe(next)
  })

  it('scores 0 and does not pay the pot to a seat that missed the nudge', () => {
    const forfeited = forfeitOpenGuesses(guessingTable())
    const paid = endRound({ ...forfeited, phase: 'showdown' })
    const ada = paid.players.find((p) => p.id === 'ada')!
    const bo = paid.players.find((p) => p.id === 'bo')!
    expect(bo.answerPoints ?? 0).toBe(0)
    expect(bo.bankroll).toBe(500)
    expect(ada.bankroll).toBe(540)
    expect(ada.answerPoints).toBe(100)
    expect(bo.answerForfeited).not.toBe(true)
  })

  it('returns each seat their own chips when nobody guessed in time', () => {
    let gs = guessingTable()
    gs = {
      ...gs,
      players: gs.players.map((p) => ({ ...p, submittedAnswer: undefined })),
    }
    const paid = endRound({ ...forfeitOpenGuesses(gs), phase: 'showdown' })
    expect(paid.players.every((p) => (p.answerPoints ?? 0) === 0)).toBe(true)
    expect(paid.players.map((p) => p.bankroll).sort()).toEqual([520, 520])
    expect(paid.round.pot).toBe(0)
  })
})
