import { describe, expect, it } from 'vitest'
import { disambiguatePublicNames, publicSeatInitials, uniquePublicDisplayName } from './publicSeatNames'

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

  it('keeps the first Chris L. and numbers the next one', () => {
    expect(uniquePublicDisplayName('Chris L.', [])).toBe('Chris L.')
    expect(uniquePublicDisplayName('Chris L.', ['Chris L.'])).toBe('Chris L. 2')
    expect(uniquePublicDisplayName('  chris l. ', ['Chris L.', 'Chris L. 2'])).toBe('chris l. 3')
    expect(uniquePublicDisplayName('Chris Long', ['Chris L.'])).toBe('Chris Long')
    expect(publicSeatInitials('Chris L. 2')).toBe('C2')
  })
})
