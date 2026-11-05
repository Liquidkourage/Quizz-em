import { describe, expect, it } from 'vitest'
import { answerClockDeadline, nudgeClockDeadline } from './answerClockDeadline'

describe('answer clock on a phone', () => {
  it('keeps the shared answer window on a locked phone during a nudge', () => {
    expect(
      answerClockDeadline({
        answerDeadline: 1_045_000,
        guessNudge: true,
        guessNudgeDeadline: 1_030_000,
      }),
    ).toBe(1_045_000)
  })

  it('keeps the answer window visible after a guess is locked', () => {
    expect(answerClockDeadline({ answerDeadline: 1_045_000 })).toBe(1_045_000)
  })

  it('shows the nudge countdown only to a player who has not locked a guess', () => {
    const round = { guessNudge: true, guessNudgeDeadline: 1_030_000 }
    expect(nudgeClockDeadline(round, {})).toBe(1_030_000)
    expect(nudgeClockDeadline(round, { submittedAnswer: 42 })).toBeUndefined()
    expect(nudgeClockDeadline(round, { answerLocked: true })).toBeUndefined()
  })
})
