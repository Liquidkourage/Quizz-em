import { describe, expect, it } from 'vitest'
import { disambiguatePublicNames, publicSeatInitials } from './publicSeatNames'

describe('public seat names', () => {
  it('leaves a unique name alone', () => {
    expect(disambiguatePublicNames(['Alice C.', 'Bo K.'])).toEqual(['Alice C.', 'Bo K.'])
    expect(publicSeatInitials('Alice C.')).toBe('AC')
  })

  it('numbers a later seat that shares a name, and marks that seat A2', () => {
    expect(disambiguatePublicNames(['Alice C.', 'Bo K.', 'Alice C.'])).toEqual([
      'Alice C.',
      'Bo K.',
      'Alice C. 2',
    ])
    expect(publicSeatInitials('Alice C. 2')).toBe('A2')
  })
})
