import { describe, expect, it } from 'vitest'
import {
  stadiumCupholderSizePx,
  stadiumHoleCardScale,
  stadiumPlayerCommunityCardSizePx,
  stadiumPlayerCupholderSizePx,
  stadiumPlayerHoleCardScale,
} from './stadiumSeatLayout'

describe('stadium player felt sizing', () => {
  it('renders much larger chrome than default at phone table widths', () => {
    const w = 360
    expect(stadiumPlayerCupholderSizePx(w)).toBeGreaterThan(stadiumCupholderSizePx(w) * 2)
    expect(stadiumPlayerHoleCardScale(w)).toBeGreaterThan(stadiumHoleCardScale(w) * 2)
    expect(stadiumPlayerCommunityCardSizePx(w).w).toBeGreaterThanOrEqual(38)
  })
})
