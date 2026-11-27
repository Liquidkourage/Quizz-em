import { describe, expect, it } from 'vitest'
import { answerRevealOpen, answerRevealWarning, guessingWindowClosed, seatOwesAGuess } from './answerReveal'

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

describe('who still owes a guess', () => {
  it('includes a points-only player who was dealt cards', () => {
    expect(seatOwesAGuess({ name: 'Cara', pointsOnly: true, hand: [{}, {}] })).toBe(true)
  })

  it('skips a points-only latecomer with no cards', () => {
    expect(seatOwesAGuess({ name: 'Cara', pointsOnly: true, hand: [] })).toBe(false)
  })

  it('closes early only after the points-only guess is in', () => {
    const cara = { name: 'Cara', pointsOnly: true, hand: [{}, {}] }
    expect(guessingWindowClosed({ deadlineMs: 10_000, nowMs: 1_000, seats: [cara] })).toBe(false)
    expect(
      guessingWindowClosed({
        deadlineMs: 10_000,
        nowMs: 1_000,
        seats: [{ ...cara, submittedAnswer: 12 }],
      }),
    ).toBe(true)
  })

  it('closes when the guide hits zero', () => {
    expect(
      guessingWindowClosed({
        deadlineMs: 10_000,
        nowMs: 10_000,
        seats: [{ name: 'Bo', hand: [{}, {}] }],
      }),
    ).toBe(true)
  })

  it('says the answer is coming in 5 seconds', () => {
    expect(answerRevealWarning(5)).toBe('The answer reveals in 5 seconds.')
  })
})
