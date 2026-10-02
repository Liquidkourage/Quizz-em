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
  stadiumPlayerSeatHoleCardScale,
} from './stadiumSeatLayout'
import { playerFeltHolePairWidthPx } from './playerFeltHoleCards'

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

  it('sizes by occupied seats so sparse tables stay readable', () => {
    const five = stadiumPlayerHoleCardScale(360, 5)
    const eight = stadiumPlayerHoleCardScale(360, 8)
    expect(five).toBeGreaterThan(eight)
    expect(five).toBeGreaterThanOrEqual(0.26)
  })

  it('keeps two-seat phone hole pairs inside the felt', () => {
    const w = 360
    const faceDown = stadiumPlayerSeatHoleCardScale(w, 2, false)
    const faceUp = stadiumPlayerSeatHoleCardScale(w, 2, true)
    expect(faceUp).toBeLessThanOrEqual(0.46)
    expect(faceUp).toBeGreaterThanOrEqual(faceDown)
    expect(playerFeltHolePairWidthPx(faceUp)).toBeLessThan(w * 0.22)
    expect(playerFeltHolePairWidthPx(faceDown)).toBeLessThan(w * 0.2)
  })

  it('allows larger hole cards on wide player felts', () => {
    const phone = stadiumPlayerSeatHoleCardScale(360, 2, true)
    const desktop = stadiumPlayerSeatHoleCardScale(720, 2, true)
    expect(desktop).toBeGreaterThan(phone)
  })
})
