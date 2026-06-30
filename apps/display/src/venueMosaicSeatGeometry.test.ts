import { describe, expect, it } from 'vitest'
import {
  MOSAIC_RING_FALLBACK_H_PX,
  MOSAIC_RING_FALLBACK_W_PX,
  VENUE_MOSAIC_CUP_ANCHORS_PCT,
  VENUE_MOSAIC_HOLE_ANCHORS_PCT,
  VENUE_MOSAIC_SEAT_COUNT,
  mosaicSeatDotPct,
  mosaicSeatHoleLayout,
  venueMosaicFeltCenterPct,
} from './venueMosaicSeatGeometry'

function insetFrac(
  cup: { leftPct: number; topPct: number },
  hole: { leftPct: number; topPct: number },
  center: { leftPct: number; topPct: number }
): number {
  const cupToCenter = Math.hypot(center.leftPct - cup.leftPct, center.topPct - cup.topPct)
  const cupToHole = Math.hypot(hole.leftPct - cup.leftPct, hole.topPct - cup.topPct)
  return cupToHole / cupToCenter
}

describe('venueMosaicSeatGeometry', () => {
  const w = MOSAIC_RING_FALLBACK_W_PX
  const h = MOSAIC_RING_FALLBACK_H_PX
  const center = venueMosaicFeltCenterPct()

  it('defines eight fixed cup and hole anchors', () => {
    expect(VENUE_MOSAIC_SEAT_COUNT).toBe(8)
    expect(VENUE_MOSAIC_CUP_ANCHORS_PCT).toHaveLength(8)
    expect(VENUE_MOSAIC_HOLE_ANCHORS_PCT).toHaveLength(8)
  })

  it('places seat 0 at top center and side seats on the rail band', () => {
    const top = mosaicSeatDotPct(0, 8, w, h)
    const right = mosaicSeatDotPct(2, 8, w, h)
    const left = mosaicSeatDotPct(6, 8, w, h)

    expect(top.leftPct).toBeCloseTo(50, 0)
    expect(top.topPct).toBeLessThan(center.topPct)
    expect(right.leftPct).toBeGreaterThan(82)
    expect(right.leftPct).toBeLessThan(90)
    expect(Math.abs(right.topPct - center.topPct)).toBeLessThan(3)
    expect(left.leftPct).toBeGreaterThan(10)
    expect(left.leftPct).toBeLessThan(18)
  })

  it('is stable regardless of measured ring size (wrapper percentages)', () => {
    const small = mosaicSeatDotPct(3, 8, 120, 70)
    const large = mosaicSeatDotPct(3, 8, 480, 280)
    expect(small).toEqual(large)
  })

  it('wraps seat indexes modulo eight', () => {
    expect(mosaicSeatDotPct(10, 8, w, h)).toEqual(mosaicSeatDotPct(2, 8, w, h))
  })

  it('pulls side-seat hole cards closer to cupholders than pole seats', () => {
    const poleCup = mosaicSeatDotPct(0, 8, w, h)
    const poleHole = mosaicSeatHoleLayout(0, 8, w, h)
    const sideCup = mosaicSeatDotPct(2, 8, w, h)
    const sideHole = mosaicSeatHoleLayout(2, 8, w, h)

    const poleFrac = insetFrac(poleCup, poleHole, center)
    const sideFrac = insetFrac(sideCup, sideHole, center)

    expect(poleFrac).toBeCloseTo(0.42, 1)
    expect(sideFrac).toBeCloseTo(0.2, 1)
    expect(sideFrac).toBeLessThan(poleFrac)
  })

  it('lerps chip stacks toward felt center when inwardFrac is set', () => {
    const cup = mosaicSeatDotPct(4, 8, w, h)
    const stack = mosaicSeatHoleLayout(4, 8, w, h, 0.28)
    expect(stack.leftPct).toBeCloseTo(
      cup.leftPct + (center.leftPct - cup.leftPct) * 0.28,
      5
    )
  })
})
