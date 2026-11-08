import { describe, expect, it } from 'vitest'
import { nextPlayerAnswerReveal } from './playerAnswerReveal'

const question = 'How many feet are in a mile?'

describe('player answer reveal', () => {
  it('opens once when the answer is released', () => {
    const key = nextPlayerAnswerReveal({
      prevPhase: 'answering',
      phase: 'showdown',
      question,
      answer: 5280,
      shownKey: null,
    })
    expect(key).toBe('5280|How many feet are in a mile?')
    expect(
      nextPlayerAnswerReveal({
        prevPhase: 'showdown',
        phase: 'showdown',
        question,
        answer: 5280,
        shownKey: key,
      }),
    ).toBeNull()
  })

  it('stays shut on the first paint and when the answer is still hidden', () => {
    expect(
      nextPlayerAnswerReveal({
        prevPhase: null,
        phase: 'showdown',
        question,
        answer: 5280,
        shownKey: null,
      }),
    ).toBeNull()
    expect(
      nextPlayerAnswerReveal({
        prevPhase: 'betting',
        phase: 'answering',
        question,
        answer: 5280,
        shownKey: null,
      }),
    ).toBeNull()
  })
})
