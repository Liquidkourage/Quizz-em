import { describe, expect, it } from 'vitest'
import {
  addPlayer,
  createEmptyGame,
  dealInitialCards,
  setQuestion,
  venueWallDisplayPot,
  SAMPLE_QUESTIONS,
} from './index'

describe('venueWallDisplayPot', () => {
  it('is zero during question setup before blinds post', () => {
    let gs = createEmptyGame('V1', 'h1')
    gs = addPlayer(gs, 'a', 'Alice')
    gs = addPlayer(gs, 'b', 'Bob')
    gs = setQuestion(gs, SAMPLE_QUESTIONS[0]!)
    expect(gs.phase).toBe('question')
    expect(venueWallDisplayPot(gs)).toBe(0)
  })

  it('is a no-op outside question setup', () => {
    let gs = createEmptyGame('V1', 'h1')
    gs = addPlayer(gs, 'a', 'Alice')
    gs = addPlayer(gs, 'b', 'Bob')
    gs = { ...gs, phase: 'betting' }
    const dealt = dealInitialCards(gs)
    expect(dealt).toBe(gs)
    expect(dealt.phase).toBe('betting')
  })

  it('reflects posted blinds after dealInitialCards', () => {
    let gs = createEmptyGame('V1', 'h1')
    gs = { ...gs, smallBlind: 10, bigBlind: 20 }
    gs = addPlayer(gs, 'a', 'Alice', 1000)
    gs = addPlayer(gs, 'b', 'Bob', 1000)
    gs = setQuestion(gs, SAMPLE_QUESTIONS[0]!)
    gs = dealInitialCards(gs)
    expect(gs.phase).toBe('betting')
    expect(gs.round.pot).toBe(30)
    expect(venueWallDisplayPot(gs)).toBe(30)
  })
})
