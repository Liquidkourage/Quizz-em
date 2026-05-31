import { describe, expect, it } from 'vitest'
import {
  createEmptyGame,
  dealHoleCards,
  openBettingRound1,
  setQuestion,
  startGame,
  SAMPLE_QUESTIONS,
} from '@qhe/core'
import { addVirtualPlayers } from './virtual-players'

describe('holes before question reveal', () => {
  it('dealHoleCards after startGame keeps question phase with hands only', () => {
    const q = SAMPLE_QUESTIONS[0]!
    let gs = createEmptyGame('V', '', '1')
    gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    gs = addVirtualPlayers(gs, 4)
    gs = startGame(gs)
    expect(gs.phase).toBe('question')
    expect(gs.round.question).toBeFalsy()

    gs = dealHoleCards(gs)
    expect(gs.phase).toBe('question')
    expect(gs.round.question).toBeFalsy()
    expect(gs.players.every((p) => p.hand.length === 2)).toBe(true)
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.pot).toBe(0)

    gs = setQuestion(gs, q)
    expect(gs.phase).toBe('question')
    expect(gs.round.question?.id).toBe(q.id)

    gs = openBettingRound1(gs)
    expect(gs.phase).toBe('betting')
    expect(gs.round.isBettingOpen).toBe(true)
    expect(gs.round.pot).toBe(30)
  })
})
