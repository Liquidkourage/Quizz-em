import { describe, expect, it } from 'vitest'
import { cardsInDigitOrder, digitsAscending } from '@qhe/ui'

describe('digit card order', () => {
  it('shows a street low to high and keeps the source slot for a duplicate', () => {
    expect(digitsAscending([5, 1, 0, 3, 9])).toEqual([0, 1, 3, 5, 9])
    const ordered = cardsInDigitOrder([{ digit: 9 }, { digit: 7 }, { digit: 9 }])
    expect(ordered.map((item) => item.card.digit)).toEqual([7, 9, 9])
    expect(ordered.map((item) => item.index)).toEqual([1, 0, 2])
  })
})
