import { describe, expect, it } from 'vitest'
import {
  STADIUM_NAME_LABEL_RADIAL,
  STADIUM_PLAYER_CUPHOLDER_RADIAL,
  STADIUM_PLAYER_HOLE_CARDS_RADIAL,
  STADIUM_PLAYER_NAME_LABEL_RADIAL,
  stadiumCupholderSizePx,
  stadiumHoleCardScale,
  stadiumPlayerCommunityCardSizePx,
  stadiumPlayerCupholderSizePx,
  stadiumPlayerHoleCardScale,
} from './stadiumSeatLayout'

describe('stadium player felt sizing', () => {
  it('keeps seat chrome readable without drowning a phone felt', () => {
    const w = 360
    expect(stadiumPlayerCupholderSizePx(w)).toBeGreaterThan(stadiumCupholderSizePx(w))
    expect(stadiumPlayerHoleCardScale(w, 5)).toBeGreaterThan(stadiumHoleCardScale(w))
    expect(stadiumPlayerCommunityCardSizePx(w, 5).w).toBeGreaterThanOrEqual(22)
  })

  it('keeps hole cards near the rail outside the community board', () => {
    expect(STADIUM_PLAYER_HOLE_CARDS_RADIAL).toBeGreaterThanOrEqual(0.88)
    expect(STADIUM_PLAYER_HOLE_CARDS_RADIAL).toBeLessThan(STADIUM_PLAYER_CUPHOLDER_RADIAL)
    expect(STADIUM_PLAYER_NAME_LABEL_RADIAL).toBeGreaterThan(STADIUM_NAME_LABEL_RADIAL)
  })

  it('shrinks hole cards as more seats share the rail', () => {
    expect(stadiumPlayerHoleCardScale(360, 6)).toBeLessThan(stadiumPlayerHoleCardScale(360, 2))
    expect(stadiumPlayerCommunityCardSizePx(360, 6).w).toBeLessThanOrEqual(
      stadiumPlayerCommunityCardSizePx(360, 2).w
    )
  })
})
