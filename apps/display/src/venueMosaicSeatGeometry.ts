import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

/** Authoring size for mosaic seat layout before ResizeObserver (16.5rem × 8.75rem @ 16px). */
export const MOSAIC_RING_FALLBACK_W_PX = 264
export const MOSAIC_RING_FALLBACK_H_PX = 140

const VENUE_FELT_INSET_TOP = 0.1
const VENUE_FELT_INSET_RIGHT = 0.06
const VENUE_FELT_INSET_BOTTOM = 0.13
const VENUE_FELT_INSET_LEFT = 0.06

const MOSAIC_SEAT_RAIL_INSET_PX = 12

/** Green felt center in ring wrapper % (0–100). */
export function venueMosaicFeltCenterPct(): { leftPct: number; topPct: number } {
  const innerW = 1 - VENUE_FELT_INSET_LEFT - VENUE_FELT_INSET_RIGHT
  const innerH = 1 - VENUE_FELT_INSET_TOP - VENUE_FELT_INSET_BOTTOM
  return {
    leftPct: (VENUE_FELT_INSET_LEFT + innerW / 2) * 100,
    topPct: (VENUE_FELT_INSET_TOP + innerH / 2) * 100,
  }
}

/**
 * Mosaic crawl: seat dots at equal arc length on the stadium perimeter.
 * Seat 0 = top center, advancing clockwise.
 */
export function mosaicSeatDotPct(
  seatIndex: number,
  seatCount: number,
  w: number,
  h: number
): { leftPct: number; topPct: number } {
  const ww = w > 0 ? w : MOSAIC_RING_FALLBACK_W_PX
  const hh = h > 0 ? h : MOSAIC_RING_FALLBACK_H_PX
  const halfW = ww / 2
  const halfH = hh / 2
  const r = halfH
  const flat = Math.max(0, halfW - r)
  const perimeter = 4 * flat + 2 * Math.PI * r
  const denom = seatCount > 0 ? seatCount : VENUE_WALL_SEAT_SLOTS
  let s = ((seatIndex / denom) * perimeter) % perimeter
  if (s < 0) s += perimeter

  let lx: number
  let ly: number
  let nx: number
  let ny: number

  if (s <= flat) {
    lx = s
    ly = -halfH
    nx = 0
    ny = -1
  } else if ((s -= flat) <= Math.PI * r) {
    const a = -Math.PI / 2 + s / r
    lx = flat + r * Math.cos(a)
    ly = r * Math.sin(a)
    nx = Math.cos(a)
    ny = Math.sin(a)
  } else if ((s -= Math.PI * r) <= 2 * flat) {
    lx = flat - s
    ly = halfH
    nx = 0
    ny = 1
  } else if ((s -= 2 * flat) <= Math.PI * r) {
    const a = Math.PI / 2 + s / r
    lx = -flat + r * Math.cos(a)
    ly = r * Math.sin(a)
    nx = Math.cos(a)
    ny = Math.sin(a)
  } else {
    s -= Math.PI * r
    lx = -flat + s
    ly = -halfH
    nx = 0
    ny = -1
  }

  const x = halfW + lx - nx * MOSAIC_SEAT_RAIL_INSET_PX
  const y = halfH + ly - ny * MOSAIC_SEAT_RAIL_INSET_PX
  return { leftPct: (x / ww) * 100, topPct: (y / hh) * 100 }
}
