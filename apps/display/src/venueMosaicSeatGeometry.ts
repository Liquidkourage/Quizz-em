import { imageNormToWrapperPct } from '@qhe/ui'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

/** Authoring size for mosaic seat layout before ResizeObserver (16.5rem × 8.75rem @ 16px). */
export const MOSAIC_RING_FALLBACK_W_PX = 264
export const MOSAIC_RING_FALLBACK_H_PX = 140

/** Venue wall always renders eight physical chairs per felt. */
export const VENUE_MOSAIC_SEAT_COUNT = VENUE_WALL_SEAT_SLOTS

/**
 * Fixed cupholder centers on the poker-table artwork (0–1 within the SVG).
 * Seat 0 = top center; advances clockwise on screen.
 * Sampled from `poker-table.svg` outer rail along rays from felt center (0.5, 0.484).
 */
export const VENUE_MOSAIC_CUP_ANCHORS_UV: ReadonlyArray<{
  readonly u: number
  readonly v: number
}> = [
  { u: 0.5, v: 0.089 },
  { u: 0.7014, v: 0.0887 },
  { u: 0.9473, v: 0.484 },
  { u: 0.7143, v: 0.9046 },
  { u: 0.5, v: 0.9047 },
  { u: 0.2857, v: 0.9046 },
  { u: 0.0531, v: 0.484 },
  { u: 0.2986, v: 0.0887 },
]

/** Fixed hole-card pair centers on the poker-table artwork (0–1). ~22% inward from each cup toward felt center. */
export const VENUE_MOSAIC_HOLE_ANCHORS_UV: ReadonlyArray<{
  readonly u: number
  readonly v: number
}> = [
  { u: 0.5, v: 0.1759 },
  { u: 0.6571, v: 0.1756 },
  { u: 0.8489, v: 0.484 },
  { u: 0.6672, v: 0.8121 },
  { u: 0.5, v: 0.8121 },
  { u: 0.3328, v: 0.8121 },
  { u: 0.1514, v: 0.484 },
  { u: 0.3429, v: 0.1756 },
]

/** Green felt center on the poker-table artwork (0–1). */
export const VENUE_MOSAIC_FELT_CENTER_UV = { u: 0.5, v: 0.484 } as const

/** Fan each card from the rail edge; wider spread toward the pot. */
export const MOSAIC_HOLE_CARD_FAN_DEG = 8

function mosaicSeatIndex(seatIndex: number): number {
  const n = VENUE_MOSAIC_SEAT_COUNT
  return ((Math.floor(seatIndex) % n) + n) % n
}

function mosaicAnchorToWrapperPct(
  anchor: { u: number; v: number },
  w: number,
  h: number
): { leftPct: number; topPct: number } {
  return imageNormToWrapperPct(anchor.u, anchor.v, w, h)
}

/** Green felt center in ring wrapper % (0–100). */
export function venueMosaicFeltCenterPct(
  w = MOSAIC_RING_FALLBACK_W_PX,
  h = MOSAIC_RING_FALLBACK_H_PX
): { leftPct: number; topPct: number } {
  return mosaicAnchorToWrapperPct(VENUE_MOSAIC_FELT_CENTER_UV, w, h)
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
 * Mosaic cupholder / seat-dot position — fixed anchor on the table artwork,
 * mapped through `object-contain` into wrapper percentages.
 */
export function mosaicSeatDotPct(
  seatIndex: number,
  _seatCount: number,
  w: number,
  h: number
): { leftPct: number; topPct: number } {
  return mosaicAnchorToWrapperPct(VENUE_MOSAIC_CUP_ANCHORS_UV[mosaicSeatIndex(seatIndex)]!, w, h)
}

/** Hole-card pair center on felt just inside the rail, rotated toward the cup. */
export function mosaicSeatHoleLayout(
  seatIndex: number,
  _seatCount: number,
  w: number,
  h: number,
  inwardFrac?: number
): { leftPct: number; topPct: number; rotateDeg: number } {
  const idx = mosaicSeatIndex(seatIndex)
  const cupUV = VENUE_MOSAIC_CUP_ANCHORS_UV[idx]!
  const cup = mosaicAnchorToWrapperPct(cupUV, w, h)
  const center = venueMosaicFeltCenterPct(w, h)

  if (inwardFrac != null) {
    const u = cupUV.u + (VENUE_MOSAIC_FELT_CENTER_UV.u - cupUV.u) * inwardFrac
    const v = cupUV.v + (VENUE_MOSAIC_FELT_CENTER_UV.v - cupUV.v) * inwardFrac
    return {
      ...mosaicAnchorToWrapperPct({ u, v }, w, h),
      rotateDeg: mosaicHoleRotateDeg(cup, center),
    }
  }

  return {
    ...mosaicAnchorToWrapperPct(VENUE_MOSAIC_HOLE_ANCHORS_UV[idx]!, w, h),
    rotateDeg: mosaicHoleRotateDeg(cup, center),
  }
}
