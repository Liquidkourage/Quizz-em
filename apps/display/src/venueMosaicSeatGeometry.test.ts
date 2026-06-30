import { describe, expect, it } from 'vitest'
import {
  MOSAIC_RING_FALLBACK_H_PX,
  MOSAIC_RING_FALLBACK_W_PX,
  VENUE_MOSAIC_CUP_ANCHORS_UV,
  VENUE_MOSAIC_HOLE_ANCHORS_UV,
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
  const center = venueMosaicFeltCenterPct(w, h)

  it('defines eight fixed cup and hole anchors', () => {
    expect(VENUE_MOSAIC_SEAT_COUNT).toBe(8)
    expect(VENUE_MOSAIC_CUP_ANCHORS_UV).toHaveLength(8)
    expect(VENUE_MOSAIC_HOLE_ANCHORS_UV).toHaveLength(8)
  })

  it('places seat 0 at top center and side seats on the rail band', () => {
    const top = mosaicSeatDotPct(0, 8, w, h)
    const right = mosaicSeatDotPct(2, 8, w, h)
    const left = mosaicSeatDotPct(6, 8, w, h)

    expect(top.leftPct).toBeCloseTo(50, 0)
    expect(top.topPct).toBeLessThan(center.topPct)
    expect(right.leftPct).toBeGreaterThan(90)
    expect(right.leftPct).toBeLessThan(98)
    expect(Math.abs(right.topPct - center.topPct)).toBeLessThan(3)
    expect(left.leftPct).toBeGreaterThan(2)
    expect(left.leftPct).toBeLessThan(10)
  })

  it('tracks the table artwork when wrapper aspect ratio changes', () => {
    const narrow = mosaicSeatDotPct(2, 8, 400, 200)
    const wide = mosaicSeatDotPct(2, 8, 320, 180)
    expect(narrow.leftPct).not.toEqual(wide.leftPct)
    expect(narrow.leftPct).toBeCloseTo(93.5, 0)
    expect(wide.leftPct).toBeCloseTo(94.73, 1)
  })

  it('wraps seat indexes modulo eight', () => {
    expect(mosaicSeatDotPct(10, 8, w, h)).toEqual(mosaicSeatDotPct(2, 8, w, h))
  })

  it('keeps hole cards between cupholders and felt center', () => {
    for (let i = 0; i < 8; i++) {
      const cup = mosaicSeatDotPct(i, 8, w, h)
      const hole = mosaicSeatHoleLayout(i, 8, w, h)
      const frac = insetFrac(cup, hole, center)
      expect(frac).toBeGreaterThan(0.12)
      expect(frac).toBeLessThan(0.35)
    }
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
