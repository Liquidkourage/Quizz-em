import { describe, expect, it } from 'vitest'
import {
  STADIUM_HOLE_CARDS_RADIAL,
  STADIUM_NAME_LABEL_RADIAL,
  STADIUM_PLAYER_HOLE_CARDS_RADIAL,
  STADIUM_PLAYER_NAME_LABEL_RADIAL,
  stadiumCupholderSizePx,
  stadiumPlayerHoleCardOverlapPx,
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

  it('pulls hole cards inward and name tags outward on player felt', () => {
    expect(STADIUM_PLAYER_HOLE_CARDS_RADIAL).toBeLessThan(STADIUM_HOLE_CARDS_RADIAL)
    expect(STADIUM_PLAYER_NAME_LABEL_RADIAL).toBeGreaterThan(STADIUM_NAME_LABEL_RADIAL)
  })

  it('spreads player hole cards side-by-side instead of overlapping', () => {
    const scale = stadiumPlayerHoleCardScale(360)
    expect(stadiumPlayerHoleCardOverlapPx(scale)).toBeGreaterThan(64 * scale)
  })
})
