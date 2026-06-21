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

  it('leaves pole and side inset unchanged when corner bump applies', () => {
    const poleCup = mosaicSeatDotPct(0, 8, w, h)
    const poleHole = mosaicSeatHoleLayout(0, 8, w, h)
    const sideCup = mosaicSeatDotPct(2, 8, w, h)
    const sideHole = mosaicSeatHoleLayout(2, 8, w, h)

    expect(insetFrac(poleCup, poleHole, center)).toBeCloseTo(0.42, 2)
    expect(insetFrac(sideCup, sideHole, center)).toBeCloseTo(0.2, 2)
  })
})
