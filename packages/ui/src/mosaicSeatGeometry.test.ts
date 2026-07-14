import { describe, expect, it } from 'vitest'
import {
  MOSAIC_FELT_CENTER_UV,
  MOSAIC_SEAT_COUNT,
  mosaicSeatDotPct,
  mosaicStadiumCupUV,
} from './mosaicSeatGeometry'

describe('mosaicSeatGeometry (shared display + player)', () => {
  it('keeps eight stadium cup anchors with poles on the flats', () => {
    expect(MOSAIC_SEAT_COUNT).toBe(8)
    const top = mosaicStadiumCupUV(0)
    const right = mosaicStadiumCupUV(2)
    const bottom = mosaicStadiumCupUV(4)
    const left = mosaicStadiumCupUV(6)
    expect(top.u).toBeCloseTo(0.5, 2)
    expect(bottom.u).toBeCloseTo(0.5, 2)
    expect(top.v).toBeLessThan(MOSAIC_FELT_CENTER_UV.v)
    expect(bottom.v).toBeGreaterThan(MOSAIC_FELT_CENTER_UV.v)
    expect(right.u).toBeGreaterThan(0.9)
    expect(left.u).toBeLessThan(0.1)
  })

  it('maps cup UVs through object-contain into wrapper percents', () => {
    const cup = mosaicSeatDotPct(0, 8, 400, 200)
    expect(cup.leftPct).toBeGreaterThan(40)
    expect(cup.leftPct).toBeLessThan(60)
    expect(cup.topPct).toBeLessThan(30)
  })
})
