import { describe, expect, it } from 'vitest'
import { triviaAnswerPoints } from './index'

describe('triviaAnswerPoints', () => {
  it('awards 100 for an exact match', () => {
    expect(triviaAnswerPoints(42, 42)).toBe(100)
    expect(triviaAnswerPoints(0, 0)).toBe(100)
  })

  it('scores by proportion of the correct magnitude', () => {
    expect(triviaAnswerPoints(5000, 10000)).toBe(50)
    expect(triviaAnswerPoints(15000, 10000)).toBe(50)
    expect(triviaAnswerPoints(42, 40)).toBe(95)
  })

  it('floors at 0 once error reaches 100% of the correct value', () => {
    expect(triviaAnswerPoints(0, 10000)).toBe(0)
    expect(triviaAnswerPoints(20000, 10000)).toBe(0)
    expect(triviaAnswerPoints(1, 0)).toBe(0)
  })
})
