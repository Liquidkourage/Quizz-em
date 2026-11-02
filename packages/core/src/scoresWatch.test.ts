import { describe, expect, it } from 'vitest'
import { advanceScoresWatch, emptyScoresWatch, noteScoresView, scoresCue } from './scoresWatch'

describe('scores on the public screens', () => {
  it('stays quiet until a hand is underway', () => {
    expect(scoresCue(emptyScoresWatch())).toEqual({ hint: null, blocked: false })
  })

  it('hints once a hand has not shown chip or trivia scores', () => {
    const hand = advanceScoresWatch(emptyScoresWatch())
    expect(scoresCue(hand).hint).toContain('have not been up')
    expect(scoresCue(hand).blocked).toBe(false)
    expect(scoresCue(noteScoresView(hand, 'leaderboard')).hint).toBeNull()
    expect(scoresCue(noteScoresView(hand, 'leaderboard-trivia')).hint).toBeNull()
    expect(scoresCue(noteScoresView(hand, 'seating-chart')).hint).toContain('have not been up')
  })

  it('holds the next hand after five without scores until one goes up', () => {
    let watch = emptyScoresWatch()
    for (let i = 0; i < 5; i++) watch = advanceScoresWatch(watch)
    const held = scoresCue(watch)
    expect(held.blocked).toBe(true)
    expect(held.hint).toContain('before the next hand')
    const shown = noteScoresView(watch, 'leaderboard')
    expect(scoresCue(shown).blocked).toBe(false)
    expect(scoresCue(advanceScoresWatch(shown)).blocked).toBe(false)
  })
})
