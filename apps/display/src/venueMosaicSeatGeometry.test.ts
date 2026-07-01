import { describe, expect, it } from 'vitest'
import {
  MOSAIC_RING_FALLBACK_H_PX,
  MOSAIC_RING_FALLBACK_W_PX,
  VENUE_MOSAIC_CUP_ANCHORS_UV,
  VENUE_MOSAIC_FELT_CENTER_UV,
  VENUE_MOSAIC_HOLE_ANCHORS_UV,
  VENUE_MOSAIC_SEAT_COUNT,
  mosaicSeatDotPct,
  mosaicSeatHoleLayout,
  mosaicSeatLabelPct,
  mosaicSeatChipInwardFrac,
  mosaicStadiumCupUV,
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

  it('defines eight stadium-derived cup and hole anchors', () => {
    expect(VENUE_MOSAIC_SEAT_COUNT).toBe(8)
    expect(VENUE_MOSAIC_CUP_ANCHORS_UV).toHaveLength(8)
    expect(VENUE_MOSAIC_HOLE_ANCHORS_UV).toHaveLength(8)
  })

  it('places pole seats on the rectangle flat edges and side seats on the semicircles', () => {
    const top = mosaicStadiumCupUV(0)
    const right = mosaicStadiumCupUV(2)
    const bottom = mosaicStadiumCupUV(4)
    const left = mosaicStadiumCupUV(6)

    expect(top.u).toBeCloseTo(0.5, 2)
    expect(bottom.u).toBeCloseTo(0.5, 2)
    expect(top.v).toBeLessThan(VENUE_MOSAIC_FELT_CENTER_UV.v)
    expect(bottom.v).toBeGreaterThan(VENUE_MOSAIC_FELT_CENTER_UV.v)
    expect(right.v).toBeCloseTo(VENUE_MOSAIC_FELT_CENTER_UV.v, 2)
    expect(left.v).toBeCloseTo(VENUE_MOSAIC_FELT_CENTER_UV.v, 2)
    expect(right.u).toBeGreaterThan(0.9)
    expect(left.u).toBeLessThan(0.1)
  })

  it('places corner seats slightly off semicircle 12/6 toward the side arc', () => {
    const topRight = mosaicStadiumCupUV(1)
    const topLeft = mosaicStadiumCupUV(7)
    const bottomRight = mosaicStadiumCupUV(3)
    const bottomLeft = mosaicStadiumCupUV(5)
    const rightSide = mosaicStadiumCupUV(2)
    const leftSide = mosaicStadiumCupUV(6)
    const flatTopRight = { u: (631 + 310.7) / 1262, v: (311 - 253.8) / 643 }

    expect(topRight.u).toBeGreaterThan(flatTopRight.u)
    expect(topRight.u).toBeLessThan(rightSide.u)
    expect(topLeft.u).toBeLessThan(1 - flatTopRight.u)
    expect(topLeft.u).toBeGreaterThan(leftSide.u)
    expect(bottomRight.u).toBeGreaterThan(flatTopRight.u)
    expect(bottomLeft.u).toBeLessThan(1 - flatTopRight.u)
    const bottomCenter = mosaicStadiumCupUV(4)
    expect(topRight.v).toBeGreaterThan(mosaicStadiumCupUV(0).v)
    expect(topLeft.v).toBeGreaterThan(mosaicStadiumCupUV(0).v)
    expect(bottomRight.v).toBeLessThan(bottomCenter.v)
    expect(bottomLeft.v).toBeLessThan(bottomCenter.v)
    expect(bottomRight.v).toBeGreaterThan(VENUE_MOSAIC_FELT_CENTER_UV.v)
    expect(bottomLeft.v).toBeGreaterThan(VENUE_MOSAIC_FELT_CENTER_UV.v)
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

  it('places name labels outward from cup through felt center', () => {
    for (let i = 0; i < 8; i++) {
      const cup = mosaicSeatDotPct(i, 8, w, h)
      const label = mosaicSeatLabelPct(i, w, h, 24)
      const center = venueMosaicFeltCenterPct(w, h)
      const cupToCenter = Math.hypot(center.leftPct - cup.leftPct, center.topPct - cup.topPct)
      const labelToCenter = Math.hypot(center.leftPct - label.leftPct, center.topPct - label.topPct)
      expect(labelToCenter).toBeGreaterThan(cupToCenter)
    }
  })

  it('keeps semicircle seats 3 and 7 closer to the rail than flat side seats', () => {
    const sideSeat = 2
    const arcSeat = 3
    const cupSide = mosaicSeatDotPct(sideSeat, 8, w, h)
    const cupArc = mosaicSeatDotPct(arcSeat, 8, w, h)
    const chipSide = mosaicSeatHoleLayout(sideSeat, 8, w, h, mosaicSeatChipInwardFrac(sideSeat))
    const chipArc = mosaicSeatHoleLayout(arcSeat, 8, w, h, mosaicSeatChipInwardFrac(arcSeat))
    const center = venueMosaicFeltCenterPct(w, h)

    const sideInset = insetFrac(cupSide, chipSide, center)
    const arcInset = insetFrac(cupArc, chipArc, center)
    expect(arcInset).toBeLessThan(sideInset)
    expect(mosaicSeatChipInwardFrac(3)).toBe(0.02)
    expect(mosaicSeatChipInwardFrac(7)).toBe(0.02)
    expect(mosaicSeatChipInwardFrac(3)).toBeLessThan(mosaicSeatChipInwardFrac(2))
  })
})
