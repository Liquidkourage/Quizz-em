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
  stadiumPlayerStreetStackPx,
  stadiumPlayerHoleCardScale,
  stadiumPlayerSeatHoleCardScale,
} from './stadiumSeatLayout'
import { playerFeltHolePairWidthPx } from './playerFeltHoleCards'

describe('stadium player felt sizing', () => {
  it('keeps five community cards inside a narrow felt', () => {
    const w = 120
    const card = stadiumPlayerCommunityCardSizePx(w, 6)
    const row = card.w * 5 + 4 * 4
    const cup = stadiumPlayerCupholderSizePx(w)
    expect(row).toBeLessThanOrEqual(w - cup * 2)
    expect(card.h).toBeLessThanOrEqual(Math.round(w * 0.22))
    expect(stadiumPlayerCupholderSizePx(88)).toBe(11)
    expect(stadiumPlayerCupholderSizePx(120)).toBe(16)
    expect(stadiumPlayerCupholderSizePx(140)).toBe(20)
    expect(stadiumPlayerCupholderSizePx(200)).toBe(20)
    expect(stadiumPlayerCupholderSizePx(280)).toBe(30)
  })

  it('keeps the pot and the street between the top and bottom seats', () => {
    const w = 130
    const h = 81
    const cup = stadiumPlayerCupholderSizePx(w)
    const fit = stadiumPlayerStreetStackPx(w, h, 6)
    const betweenSeats = h * 0.4
    expect(fit.potPx + fit.gapPx + fit.cardH).toBeLessThanOrEqual(betweenSeats)
    expect(fit.cardW).toBe(10)
    expect(fit.cardH).toBe(15)
    expect(fit.potPx).toBeCloseTo(12.445, 3)
    expect(fit.gapPx).toBe(4)
    expect(fit.cardW * 5 + fit.gapPx * 4).toBeLessThanOrEqual(w - cup * 2)

    const phone = stadiumPlayerStreetStackPx(249, 156, 6)
    const natural = stadiumPlayerCommunityCardSizePx(249, 6)
    expect(phone.cardW).toBe(natural.w)
    expect(phone.cardH).toBe(natural.h)
    expect(phone.potPx).toBe(27.2)

    const edge = stadiumPlayerStreetStackPx(249, 140.5, 6)
    expect(edge.cardW).toBe(natural.w)
    expect(edge.cardH).toBe(natural.h)

    const unmeasured = stadiumPlayerStreetStackPx(249, 0, 6)
    expect(unmeasured.cardW).toBe(natural.w)
    expect(unmeasured.potPx).toBe(27.2)
    expect(stadiumPlayerStreetStackPx(249, -1, 6).cardW).toBe(natural.w)
    expect(stadiumPlayerStreetStackPx(0, 156, 6).cardW).toBe(stadiumPlayerCommunityCardSizePx(360, 6).w)
    expect(stadiumPlayerStreetStackPx(-8, 156, 6).potPx).toBe(stadiumPlayerStreetStackPx(360, 156, 6).potPx)
    expect(stadiumPlayerCupholderSizePx(0)).toBe(stadiumPlayerCupholderSizePx(360))
    expect(stadiumPlayerCupholderSizePx(-4)).toBe(stadiumPlayerCupholderSizePx(360))
  })

  it('keeps seat chrome readable without drowning a phone felt', () => {
    const w = 360
    expect(stadiumPlayerCupholderSizePx(w)).toBeGreaterThan(stadiumCupholderSizePx(w))
    expect(stadiumPlayerHoleCardScale(w, 5)).toBeGreaterThan(stadiumHoleCardScale(w))
    expect(stadiumPlayerCommunityCardSizePx(w, 5).w).toBe(20)
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
    expect(faceUp).toBeLessThanOrEqual(0.52)
    expect(faceUp).toBeGreaterThanOrEqual(faceDown)
    expect(playerFeltHolePairWidthPx(faceUp)).toBeLessThan(w * 0.26)
    expect(playerFeltHolePairWidthPx(faceDown)).toBeLessThan(w * 0.24)
  })

  it('allows larger hole cards on wide player felts', () => {
    const phone = stadiumPlayerSeatHoleCardScale(360, 2, true)
    const desktop = stadiumPlayerSeatHoleCardScale(720, 2, true)
    expect(desktop).toBeGreaterThan(phone)
  })
})
