import { describe, expect, it } from 'vitest'
import { formatTriviaPoints, formatTriviaPointsLine, formatWholeTriviaPoints, triviaAnswerPoints } from './index'

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

  it('rounds the award to the nearest hundredth of a point', () => {
    expect(triviaAnswerPoints(2, 3)).toBe(66.67)
    expect(triviaAnswerPoints(1, 3)).toBe(33.33)
  })
})

describe('formatTriviaPoints', () => {
  it('shows a total at the nearest hundredth and keeps a whole number whole', () => {
    expect(formatTriviaPoints(66.666666)).toBe('66.67')
    expect(formatTriviaPoints(100)).toBe('100')
    expect(formatTriviaPoints(1234.567)).toBe('1,234.57')
  })
})

describe('formatTriviaPointsLine', () => {
  it('keeps hundredths and the pts unit', () => {
    expect(formatTriviaPointsLine(66.666666)).toBe('66.67 pts')
    expect(formatTriviaPointsLine(90)).toBe('90.00 pts')
    expect(formatTriviaPointsLine(1234.567)).toBe('1,234.57 pts')
  })
})

describe('formatWholeTriviaPoints', () => {
  it('drops the fraction and keeps the pts. unit', () => {
    expect(formatWholeTriviaPoints(66.666666)).toBe('66 pts.')
    expect(formatWholeTriviaPoints(90)).toBe('90 pts.')
    expect(formatWholeTriviaPoints(90.9)).toBe('90 pts.')
    expect(formatWholeTriviaPoints(1234.567)).toBe('1,234 pts.')
  })
})
