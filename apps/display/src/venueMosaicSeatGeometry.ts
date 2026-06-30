import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

/** Authoring size for mosaic seat layout before ResizeObserver (16.5rem × 8.75rem @ 16px). */
export const MOSAIC_RING_FALLBACK_W_PX = 264
export const MOSAIC_RING_FALLBACK_H_PX = 140

/** Venue wall always renders eight physical chairs per felt. */
export const VENUE_MOSAIC_SEAT_COUNT = VENUE_WALL_SEAT_SLOTS

const VENUE_FELT_INSET_TOP = 0.1
const VENUE_FELT_INSET_RIGHT = 0.06
const VENUE_FELT_INSET_BOTTOM = 0.13
const VENUE_FELT_INSET_LEFT = 0.06

/**
 * Fixed cupholder centers on the felt wrapper (0–100%).
 * Seat 0 = top center; advances clockwise on screen.
 * Authored for aspect 17/10 against the poker-table asset (side seats inset vs stadium apex).
 */
export const VENUE_MOSAIC_CUP_ANCHORS_PCT: ReadonlyArray<{
  readonly leftPct: number
  readonly topPct: number
}> = [
  { leftPct: 50.0, topPct: 10.6 },
  { leftPct: 79.6, topPct: 12.9 },
  { leftPct: 86.5, topPct: 50.0 },
  { leftPct: 79.6, topPct: 87.1 },
  { leftPct: 50.0, topPct: 89.4 },
  { leftPct: 20.4, topPct: 87.1 },
  { leftPct: 13.5, topPct: 50.0 },
  { leftPct: 20.4, topPct: 12.9 },
]

/** Fixed hole-card pair centers on the felt wrapper (0–100%). */
export const VENUE_MOSAIC_HOLE_ANCHORS_PCT: ReadonlyArray<{
  readonly leftPct: number
  readonly topPct: number
}> = [
  { leftPct: 50.0, topPct: 26.5 },
  { leftPct: 68.6, topPct: 26.1 },
  { leftPct: 79.2, topPct: 49.7 },
  { leftPct: 68.3, topPct: 72.4 },
  { leftPct: 50.0, topPct: 72.2 },
  { leftPct: 31.7, topPct: 72.4 },
  { leftPct: 20.8, topPct: 49.7 },
  { leftPct: 31.4, topPct: 26.1 },
]

/** Fan each card from the rail edge; wider spread toward the pot. */
export const MOSAIC_HOLE_CARD_FAN_DEG = 8

function mosaicSeatIndex(seatIndex: number): number {
  const n = VENUE_MOSAIC_SEAT_COUNT
  return ((Math.floor(seatIndex) % n) + n) % n
}

/** Green felt center in ring wrapper % (0–100). */
export function venueMosaicFeltCenterPct(): { leftPct: number; topPct: number } {
  const innerW = 1 - VENUE_FELT_INSET_LEFT - VENUE_FELT_INSET_RIGHT
  const innerH = 1 - VENUE_FELT_INSET_TOP - VENUE_FELT_INSET_BOTTOM
  return {
    leftPct: (VENUE_FELT_INSET_LEFT + innerW / 2) * 100,
    topPct: (VENUE_FELT_INSET_TOP + innerH / 2) * 100,
  }
}

function mosaicHoleRotateDeg(
  cup: { leftPct: number; topPct: number },
  center: { leftPct: number; topPct: number }
): number {
  const outX = cup.leftPct - center.leftPct
  const outY = cup.topPct - center.topPct
  const len = Math.hypot(outX, outY) || 1
  return (Math.atan2(outY / len, outX / len) * 180) / Math.PI + 90
}

/**
 * Mosaic cupholder / seat-dot position — fixed anchor on the felt wrapper.
 * `w` / `h` are ignored (percentages scale with the measured ring automatically).
 */
export function mosaicSeatDotPct(
  seatIndex: number,
  _seatCount: number,
  _w: number,
  _h: number
): { leftPct: number; topPct: number } {
  return { ...VENUE_MOSAIC_CUP_ANCHORS_PCT[mosaicSeatIndex(seatIndex)]! }
}

/** Hole-card pair center on felt just inside the rail, rotated toward the cup. */
export function mosaicSeatHoleLayout(
  seatIndex: number,
  _seatCount: number,
  _w: number,
  _h: number,
  inwardFrac?: number
): { leftPct: number; topPct: number; rotateDeg: number } {
  const idx = mosaicSeatIndex(seatIndex)
  const cup = VENUE_MOSAIC_CUP_ANCHORS_PCT[idx]!
  const center = venueMosaicFeltCenterPct()

  if (inwardFrac != null) {
    return {
      leftPct: cup.leftPct + (center.leftPct - cup.leftPct) * inwardFrac,
      topPct: cup.topPct + (center.topPct - cup.topPct) * inwardFrac,
      rotateDeg: mosaicHoleRotateDeg(cup, center),
    }
  }

  const hole = VENUE_MOSAIC_HOLE_ANCHORS_PCT[idx]!
  return {
    leftPct: hole.leftPct,
    topPct: hole.topPct,
    rotateDeg: mosaicHoleRotateDeg(cup, center),
  }
}
