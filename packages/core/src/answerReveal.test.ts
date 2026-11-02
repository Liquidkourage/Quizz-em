import { describe, expect, it } from 'vitest'
import { answerRevealOpen } from './answerReveal'

describe('reveal the answer', () => {
  it('stays closed while time is left and a guess is missing', () => {
    expect(
      answerRevealOpen({ deadlineMs: 10_000, submitted: 1, expected: 2, nowMs: 9_000 }),
    ).toBe(false)
  })

  it('opens when every player has guessed, even with time left', () => {
    expect(
      answerRevealOpen({ deadlineMs: 10_000, submitted: 2, expected: 2, nowMs: 1_000 }),
    ).toBe(true)
  })

  it('opens when the timer hits 0, even with guesses missing', () => {
    expect(
      answerRevealOpen({ deadlineMs: 10_000, submitted: 0, expected: 2, nowMs: 10_000 }),
    ).toBe(true)
  })
})
