import { describe, expect, it } from 'vitest'
import {
  STADIUM_CUPHOLDER_RADIAL,
  STADIUM_HOLE_CARDS_RADIAL,
  stadiumSeatPointPx,
  stadiumSeatThetaRad,
} from '@qhe/ui'

describe('stadiumSeatLayout', () => {
  it('places seat 0 at the top center on the rail', () => {
    const pt = stadiumSeatPointPx(0, 8, 800, 500, STADIUM_CUPHOLDER_RADIAL)
    expect(pt.leftPct).toBeCloseTo(50, 0)
    expect(pt.topPct).toBeLessThan(15)
    expect(pt.rotateDeg).toBeCloseTo(0, 0)
  })

  it('places hole cards inward from cupholders toward the center', () => {
    const cup = stadiumSeatPointPx(0, 8, 800, 500, STADIUM_CUPHOLDER_RADIAL)
    const hole = stadiumSeatPointPx(0, 8, 800, 500, STADIUM_HOLE_CARDS_RADIAL)
    expect(hole.topPct).toBeGreaterThan(cup.topPct)
    expect(hole.rotateDeg).toBeCloseTo(cup.rotateDeg, 0)
  })

  it('rotates side seats so card tops face outward', () => {
    const right = stadiumSeatPointPx(2, 8, 800, 500, STADIUM_HOLE_CARDS_RADIAL)
    expect(Math.abs(right.rotateDeg)).toBeGreaterThan(45)
  })

  it('uses CCW seat indexing from clock top', () => {
    expect(stadiumSeatThetaRad(0, 8)).toBeCloseTo(-Math.PI / 2, 5)
    expect(stadiumSeatThetaRad(2, 8)).toBeCloseTo(0, 5)
  })
})
