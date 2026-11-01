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
  mosaicSeatInwardPct,
  mosaicSeatChipInwardFrac,
  mosaicStadiumCupUV,
  broadcastBlindMarkerPct,
  broadcastFeltAssetAnchors,
  broadcastRimStackPct,
  broadcastRimStackOffsetPx,
  broadcastRimLabelMaxWidthPx,
  broadcastRimLabelTransform,
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

  it('places stack amounts inward from the cup toward felt center', () => {
    for (let i = 0; i < 8; i++) {
      const cup = mosaicSeatDotPct(i, 8, w, h)
      const stack = mosaicSeatInwardPct(i, w, h, 24)
      const cupToCenter = Math.hypot(center.leftPct - cup.leftPct, center.topPct - cup.topPct)
      const stackToCenter = Math.hypot(center.leftPct - stack.leftPct, center.topPct - stack.topPct)
      expect(stackToCenter).toBeLessThan(cupToCenter)
    }
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

  it('offsets broadcast blind markers clockwise along the rail toward the next seat', () => {
    const markerPx = 44
    for (let i = 0; i < 8; i++) {
      const cup = mosaicSeatDotPct(i, 8, w, h)
      const blind = broadcastBlindMarkerPct(i, 8, w, h, markerPx)
      const nextCup = mosaicSeatDotPct((i + 1) % 8, 8, w, h)
      const cupX = (cup.leftPct / 100) * w
      const cupY = (cup.topPct / 100) * h
      const blindX = (blind.leftPct / 100) * w
      const blindY = (blind.topPct / 100) * h
      const nextX = (nextCup.leftPct / 100) * w
      const nextY = (nextCup.topPct / 100) * h
      const alongX = nextX - cupX
      const alongY = nextY - cupY
      const alongLen = Math.hypot(alongX, alongY) || 1
      const ux = alongX / alongLen
      const uy = alongY / alongLen
      const deltaX = blindX - cupX
      const deltaY = blindY - cupY
      const projected = deltaX * ux + deltaY * uy
      expect(projected).toBeGreaterThan(20)
      expect(projected).toBeLessThan(80)
    }
    const seat0 = broadcastBlindMarkerPct(0, 8, w, h, markerPx)
    const seat0Cup = mosaicSeatDotPct(0, 8, w, h)
    expect(seat0.leftPct).toBeGreaterThan(seat0Cup.leftPct)
  })

  it('places broadcast rim stack inward from the name toward felt center on pole and arc seats', () => {
    // Flat side seats (2 and 6) stack straight down instead; the flat side seats test below covers them.
    for (const i of [0, 1, 3, 4, 5, 7]) {
      const name = mosaicSeatLabelPct(i, w, h, 28)
      const stack = broadcastRimStackPct(i, name, w, h, 36)
      const center = venueMosaicFeltCenterPct(w, h)
      const nameDist = Math.hypot(name.leftPct - center.leftPct, name.topPct - center.topPct)
      const stackDist = Math.hypot(stack.leftPct - center.leftPct, stack.topPct - center.topPct)
      expect(stackDist).toBeLessThan(nameDist)
    }
  })

  it('stacks broadcast rim bankroll below the name on flat side seats', () => {
    for (const i of [2, 6]) {
      const name = mosaicSeatLabelPct(i, w, h, 28)
      const stack = broadcastRimStackPct(i, name, w, h, 36)
      expect(stack.topPct).toBeGreaterThan(name.topPct)
      if (i === 2) {
        expect(stack.leftPct).toBeLessThan(name.leftPct)
      } else {
        expect(stack.leftPct).toBeGreaterThan(name.leftPct)
      }
    }
  })

  it('gives arc seats a larger name-to-stack gap than pole seats', () => {
    const fontPx = 34
    expect(broadcastRimStackOffsetPx(1, fontPx)).toBeGreaterThan(broadcastRimStackOffsetPx(0, fontPx))
    expect(broadcastRimStackOffsetPx(3, fontPx)).toBeGreaterThan(broadcastRimStackOffsetPx(4, fontPx))
  })

  it('separates arc seat name and stack primarily on the vertical axis', () => {
    for (const i of [1, 7]) {
      const name = mosaicSeatLabelPct(i, w, h, 28)
      const offset = broadcastRimStackOffsetPx(i, 34)
      const stack = broadcastRimStackPct(i, name, w, h, offset)
      const dy = Math.abs(stack.topPct - name.topPct)
      const dx = Math.abs(stack.leftPct - name.leftPct)
      expect(dy).toBeGreaterThan(0.35)
      expect(dx).toBeLessThan(dy * 0.1)
    }
  })
})

describe('broadcast felt assets', () => {
  const w = 1134
  const h = 643
  const marker = 44

  function distPx(
    a: { leftPct: number; topPct: number },
    b: { leftPct: number; topPct: number },
  ): number {
    return Math.hypot(((a.leftPct - b.leftPct) / 100) * w, ((a.topPct - b.topPct) / 100) * h)
  }

  it('keeps cards, chips, and the button in a cluster at the seat', () => {
    for (let i = 0; i < 8; i++) {
      const { hole, chip, blind } = broadcastFeltAssetAnchors(i, w, h, marker)
      const cup = mosaicSeatDotPct(i, 8, w, h)
      const name = mosaicSeatLabelPct(i, w, h, 70)
      const stack = broadcastRimStackPct(i, name, w, h, broadcastRimStackOffsetPx(i, 34))
      expect(distPx(hole, cup)).toBeGreaterThan(36)
      expect(distPx(hole, cup)).toBeLessThan(60)
      expect(distPx(chip, cup)).toBeLessThan(84)
      expect(distPx(blind, cup)).toBeLessThan(84)
      expect(distPx(hole, chip)).toBeGreaterThan(44)
      expect(distPx(hole, blind)).toBeGreaterThan(44)
      expect(distPx(chip, blind)).toBeGreaterThan(44)
      expect(distPx(stack, hole)).toBeGreaterThan(48)
      expect(distPx(stack, chip)).toBeGreaterThan(48)
      expect(distPx(stack, blind)).toBeGreaterThan(48)
    }
  })
})

describe('broadcastRimLabel dual density', () => {
  const w = 640
  const h = 360

  it('caps dual max width to the inset felt, not the viewport', () => {
    expect(broadcastRimLabelMaxWidthPx(w, 'dual')).toBe(Math.round(Math.min(w * 0.26, 136)))
    expect(broadcastRimLabelMaxWidthPx(w, 'solo')).toBe(Math.min(208, Math.round(w * 0.38)))
  })

  it('anchors right-side dual labels outward with translate(0%)', () => {
    const name = mosaicSeatLabelPct(2, w, h, 22)
    expect(broadcastRimLabelTransform(name, w, h, 'dual')).toBe('translate(0%, -50%)')
  })

  it('anchors left-side dual labels outward with translate(-100%)', () => {
    const name = mosaicSeatLabelPct(6, w, h, 22)
    expect(broadcastRimLabelTransform(name, w, h, 'dual')).toBe('translate(-100%, -50%)')
  })

  it('keeps solo labels centered', () => {
    const name = mosaicSeatLabelPct(2, w, h, 28)
    expect(broadcastRimLabelTransform(name, w, h, 'solo')).toBe('translate(-50%, -50%)')
  })
})
