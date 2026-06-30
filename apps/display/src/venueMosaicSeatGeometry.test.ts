import { describe, expect, it } from 'vitest'
import {
  MOSAIC_RING_FALLBACK_H_PX,
  MOSAIC_RING_FALLBACK_W_PX,
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

  it('pulls side-seat hole cards closer to cupholders than pole seats', () => {
    const poleCup = mosaicSeatDotPct(0, 8, w, h)
    const poleHole = mosaicSeatHoleLayout(0, 8, w, h)
    const sideCup = mosaicSeatDotPct(2, 8, w, h)
    const sideHole = mosaicSeatHoleLayout(2, 8, w, h)

    const poleFrac = insetFrac(poleCup, poleHole, center)
    const sideFrac = insetFrac(sideCup, sideHole, center)

    expect(poleFrac).toBeCloseTo(0.42, 2)
    expect(sideFrac).toBeCloseTo(0.2, 2)
    expect(sideFrac).toBeLessThan(poleFrac)
  })

  it('eases corner seats between pole and side inset', () => {
    const cornerCup = mosaicSeatDotPct(1, 8, w, h)
    const cornerHole = mosaicSeatHoleLayout(1, 8, w, h)
    const cornerFrac = insetFrac(cornerCup, cornerHole, center)

    expect(cornerFrac).toBeGreaterThan(0.28)
    expect(cornerFrac).toBeLessThan(0.42)
  })

  it('pulls 3 and 9 o-clock cupholders inward toward the felt center', () => {
    const right = mosaicSeatDotPct(2, 8, w, h)
    const left = mosaicSeatDotPct(6, 8, w, h)
    expect(right.leftPct).toBeLessThan(91)
    expect(left.leftPct).toBeGreaterThan(9)
    expect(Math.abs(right.leftPct - center.leftPct)).toBeLessThan(43)
    expect(Math.abs(left.leftPct - center.leftPct)).toBeLessThan(43)
  })

  it('does not pull top / bottom pole cupholders toward center', () => {
    const pole = mosaicSeatDotPct(0, 8, w, h)
    expect(Math.abs(pole.leftPct - center.leftPct)).toBeLessThan(4)
    expect(pole.topPct).toBeLessThan(center.topPct)
  })
})
