import {
  STADIUM_CUPHOLDER_RADIAL,
  stadiumSeatPointPx,
} from '@qhe/ui'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

/** Authoring size for mosaic seat layout before ResizeObserver (16.5rem × 8.75rem @ 16px). */
export const MOSAIC_RING_FALLBACK_W_PX = 264
export const MOSAIC_RING_FALLBACK_H_PX = 140

const VENUE_FELT_INSET_TOP = 0.1
const VENUE_FELT_INSET_RIGHT = 0.06
const VENUE_FELT_INSET_BOTTOM = 0.13
const VENUE_FELT_INSET_LEFT = 0.06

/** Green felt center in ring wrapper % (0–100). */
export function venueMosaicFeltCenterPct(): { leftPct: number; topPct: number } {
  const innerW = 1 - VENUE_FELT_INSET_LEFT - VENUE_FELT_INSET_RIGHT
  const innerH = 1 - VENUE_FELT_INSET_TOP - VENUE_FELT_INSET_BOTTOM
  return {
    leftPct: (VENUE_FELT_INSET_LEFT + innerW / 2) * 100,
    topPct: (VENUE_FELT_INSET_TOP + innerH / 2) * 100,
  }
}

/** Cupholder on the stadium rail — seat 0 at top center, CCW. */
export function mosaicSeatDotPct(
  seatIndex: number,
  seatCount: number,
  w: number,
  h: number
): { leftPct: number; topPct: number } {
  const denom = seatCount > 0 ? seatCount : VENUE_WALL_SEAT_SLOTS
  const pt = stadiumSeatPointPx(seatIndex, denom, w, h, STADIUM_CUPHOLDER_RADIAL)
  return { leftPct: pt.leftPct, topPct: pt.topPct }
}
