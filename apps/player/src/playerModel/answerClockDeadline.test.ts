import { describe, expect, it } from 'vitest'
import { answerClockDeadline } from './answerClockDeadline'

describe('answer clock on a phone', () => {
  it('hides a nudge countdown from a player who already locked a guess', () => {
    expect(
      answerClockDeadline(
        { answerDeadline: 1_030_000, guessNudge: true },
        { submittedAnswer: 42 },
      ),
    ).toBeUndefined()
  })

  it('shows the nudge countdown to a player who has not locked a guess', () => {
    expect(answerClockDeadline({ answerDeadline: 1_030_000, guessNudge: true }, {})).toBe(1_030_000)
  })

  it('keeps the answer window visible after a guess is locked', () => {
    expect(answerClockDeadline({ answerDeadline: 1_045_000 }, { submittedAnswer: 42 })).toBe(1_045_000)
  })
})
