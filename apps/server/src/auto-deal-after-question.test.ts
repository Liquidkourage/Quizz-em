import { describe, expect, it } from 'vitest'
import { createEmptyGame, dealInitialCards, setQuestion, SAMPLE_QUESTIONS } from '@qhe/core'
import { addVirtualPlayers } from './virtual-players'

describe('auto deal after question', () => {
  it('dealInitialCards advances question setup to betting', () => {
    const q = SAMPLE_QUESTIONS[0]!
    let gs = createEmptyGame('V', '', '1')
    gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    gs = addVirtualPlayers(gs, 4)
    gs = setQuestion(gs, q)
    expect(gs.phase).toBe('question')
    expect(gs.round.question?.id).toBe(q.id)

    gs = dealInitialCards(gs)
    expect(gs.phase).toBe('betting')
    expect(gs.players.every((p) => p.hand.length === 2)).toBe(true)
  })
})
