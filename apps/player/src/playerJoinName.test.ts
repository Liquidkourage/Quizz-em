import { describe, expect, it } from 'vitest'
import {
  composePlayerDisplayName,
  parsePlayerDisplayName,
  sanitizeLastInitialInput,
} from './playerJoinName'

describe('composePlayerDisplayName', () => {
  it('combines first name and last initial', () => {
    expect(composePlayerDisplayName('Alice', 'C')).toBe('Alice C.')
    expect(composePlayerDisplayName('  Bob  ', ' m ')).toBe('Bob M.')
  })

  it('returns first name only when initial is empty', () => {
    expect(composePlayerDisplayName('Grace', '')).toBe('Grace')
  })
})

describe('parsePlayerDisplayName', () => {
  it('splits venue-style names', () => {
    expect(parsePlayerDisplayName('Alice C.')).toEqual({ firstName: 'Alice', lastInitial: 'C' })
    expect(parsePlayerDisplayName('Alice Chen')).toEqual({ firstName: 'Alice', lastInitial: 'C' })
    expect(parsePlayerDisplayName('Grace')).toEqual({ firstName: 'Grace', lastInitial: '' })
  })
})

describe('sanitizeLastInitialInput', () => {
  it('keeps a single letter', () => {
    expect(sanitizeLastInitialInput('x')).toBe('X')
    expect(sanitizeLastInitialInput('9')).toBe('')
  })
})
