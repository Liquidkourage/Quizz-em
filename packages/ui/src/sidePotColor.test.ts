import { describe, expect, it } from 'vitest'
import { sidePotColor } from './ChipMark'

const SIDE_POT_COLORS = [
  '#7dd3fc',
  '#ea580c',
  '#6ee7b7',
  '#a855f7',
  '#fde047',
  '#0d9488',
  '#f9a8d4',
] as const

describe('side pot colors', () => {
  it('assigns side pots 1 through 7 a bright-then-deep series', () => {
    for (let mark = 1; mark <= SIDE_POT_COLORS.length; mark++) {
      expect(sidePotColor(mark)).toBe(SIDE_POT_COLORS[mark - 1])
    }
  })

  it('reuses sky when an eighth side pot wraps', () => {
    expect(sidePotColor(8)).toBe('#7dd3fc')
  })
})
