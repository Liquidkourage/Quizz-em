import { describe, expect, it } from 'vitest'
import {
  createEmptyGame,
  pickRandomQuestion,
  setQuestion,
  SAMPLE_QUESTIONS,
  STARTER_QUESTION_SET,
  VENUE_QUESTION_SET_LENGTH,
  createStarterSetlist,
  isSetlistTargetLength,
} from './index'

describe('starter question set', () => {
  it('defines a full 25-question starter set and setlist', () => {
    expect(STARTER_QUESTION_SET).toHaveLength(VENUE_QUESTION_SET_LENGTH)
    expect(SAMPLE_QUESTIONS).toHaveLength(VENUE_QUESTION_SET_LENGTH)
    const sl = createStarterSetlist()
    expect(sl.questionIds).toHaveLength(VENUE_QUESTION_SET_LENGTH)
    expect(isSetlistTargetLength(sl.questionIds.length)).toBe(true)
  })
})

describe('setQuestion', () => {
  it('installs the given question and clears community cards', () => {
    const gs = createEmptyGame('V1', 'h1')
    const q = SAMPLE_QUESTIONS[0]!
    const next = setQuestion(
      {
        ...gs,
        phase: 'betting',
        round: { ...gs.round, communityCards: [{ digit: 2 }], question: null },
      },
      q
    )
    expect(next.phase).toBe('question')
    expect(next.round.question).toEqual(q)
    expect(next.round.communityCards).toEqual([])
    expect(next.round.pot).toBe(0)
    expect(next.round.playerBets).toEqual({})
    expect(next.round.handContributions).toEqual({})
  })
})

describe('pickRandomQuestion', () => {
  it('returns undefined for an empty bank', () => {
    expect(pickRandomQuestion([])).toBeUndefined()
  })
})
