import { capsuleBoundaryHitPx } from './tableRimGeometry'

/** Seat 0 = clock top; advances counter-clockwise (viewed from above). */
export function stadiumSeatThetaRad(seatIndex: number, seatCount: number): number {
  const n = Math.max(1, Math.floor(seatCount))
  return (seatIndex / n) * 2 * Math.PI - Math.PI / 2
}

export type StadiumSeatPoint = {
  x: number
  y: number
  leftPct: number
  topPct: number
  /** Rotate hole cards so the top edge faces outward toward the rail. */
  rotateDeg: number
  /** Outward unit normal (toward the rail). */
  nx: number
  ny: number
}

/**
 * Point on the stadium table: `radialScale` 1 = outer boundary (cupholder on rail),
 * lower values move toward the felt center (hole cards in front of the seat).
 */
export function stadiumSeatPointPx(
  seatIndex: number,
  seatCount: number,
  w: number,
  h: number,
  radialScale: number
): StadiumSeatPoint {
  const ww = w > 0 ? w : 260
  const hh = h > 0 ? h : 163
  const cx = ww / 2
  const cy = hh / 2
  const halfW = ww / 2
  const halfH = hh / 2
  const θ = stadiumSeatThetaRad(seatIndex, seatCount)
  const dx = Math.cos(θ)
  const dy = Math.sin(θ)
  const hit = capsuleBoundaryHitPx(cx, cy, halfW, halfH, dx, dy)
  if (!hit) {
    return {
      x: cx,
      y: cy,
      leftPct: 50,
      topPct: 50,
      rotateDeg: 0,
      nx: 0,
      ny: -1,
    }
  }
  const x = cx + (hit.x - cx) * radialScale
  const y = cy + (hit.y - cy) * radialScale
  const outLen = Math.hypot(x - cx, y - cy) || 1
  /** Outward from felt center toward the rail — aligns hole-card tops with the seat. */
  const nx = (x - cx) / outLen
  const ny = (y - cy) / outLen
  const rotateDeg = (Math.atan2(ny, nx) * 180) / Math.PI + 90
  return {
    x,
    y,
    leftPct: (x / ww) * 100,
    topPct: (y / hh) * 100,
    rotateDeg,
    nx,
    ny,
  }
}

/** Cupholder centered on the table rail / border. */
export const STADIUM_CUPHOLDER_RADIAL = 1

/** Hole cards on the felt just inside the rail, toward the pot. */
export const STADIUM_HOLE_CARDS_RADIAL = 0.86
