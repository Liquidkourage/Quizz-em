import { imageNormToWrapperPct, POKER_TABLE_GRAPHIC_ASPECT } from '@qhe/ui'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

/** Authoring size for mosaic seat layout before ResizeObserver (16.5rem × 8.75rem @ 16px). */
export const MOSAIC_RING_FALLBACK_W_PX = 264
export const MOSAIC_RING_FALLBACK_H_PX = 140

/** Venue wall always renders eight physical chairs per felt. */
export const VENUE_MOSAIC_SEAT_COUNT = VENUE_WALL_SEAT_SLOTS

/** `poker-table.svg` pixel size — stadium math is authored in this space, then normalized to u/v. */
const POKER_TABLE_IMG_W = 1262
const POKER_TABLE_IMG_H = 643

/**
 * Stadium table on the artwork: left semicircle + center rectangle + right semicircle.
 * `halfW` = center → side (3/9 o'clock); `rSide` = semicircle radius; flat span = halfW − rSide.
 * `rBottom` > `rTop` matches the artwork’s slightly deeper bottom rail.
 */
export const VENUE_MOSAIC_FELT_CENTER_UV = { u: 0.5, v: 0.484 } as const

const VENUE_MOSAIC_STADIUM_HALF_W_PX = 564.5
const VENUE_MOSAIC_STADIUM_R_SIDE_PX = 253.8
const VENUE_MOSAIC_STADIUM_R_TOP_PX = 253.8
const VENUE_MOSAIC_STADIUM_R_BOTTOM_PX = 270.4

/** Half-width of the flat rectangle between the two semicircles. */
const VENUE_MOSAIC_STADIUM_FLAT_HALF_PX =
  VENUE_MOSAIC_STADIUM_HALF_W_PX - VENUE_MOSAIC_STADIUM_R_SIDE_PX

/** Hole-card pair inset from cup toward felt center (0 = on cup, 1 = at center). */
export const VENUE_MOSAIC_HOLE_INWARD_FRAC = 0.22

/** Fan each card from the rail edge; wider spread toward the pot. */
export const MOSAIC_HOLE_CARD_FAN_DEG = 8

/**
 * Eight seat headings — explicit semicircle + rectangle points (not equal angles from center).
 * Seat 0 = rect top · 1 R12 · 2 R3 · 3 R6 · 4 rect bottom · 5 L6 · 6 L9 · 7 L12
 */
export function mosaicStadiumSeatThetaRad(seatIndex: number): number {
  return (mosaicSeatIndex(seatIndex) / VENUE_MOSAIC_SEAT_COUNT) * 2 * Math.PI - Math.PI / 2
}

function mosaicSeatIndex(seatIndex: number): number {
  const n = VENUE_MOSAIC_SEAT_COUNT
  return ((Math.floor(seatIndex) % n) + n) % n
}

/**
 * Cupholder on the stadium rail — each of the eight authored points from the
 * semicircle + rectangle model, then normalized to artwork u/v.
 */
export function mosaicStadiumCupUV(seatIndex: number): { u: number; v: number } {
  const cx = VENUE_MOSAIC_FELT_CENTER_UV.u * POKER_TABLE_IMG_W
  const cy = VENUE_MOSAIC_FELT_CENTER_UV.v * POKER_TABLE_IMG_H
  const flat = VENUE_MOSAIC_STADIUM_FLAT_HALF_PX
  const xRight = cx + flat
  const xLeft = cx - flat

  switch (mosaicSeatIndex(seatIndex)) {
    case 0:
      return { u: cx / POKER_TABLE_IMG_W, v: (cy - VENUE_MOSAIC_STADIUM_R_TOP_PX) / POKER_TABLE_IMG_H }
    case 1:
      return {
        u: xRight / POKER_TABLE_IMG_W,
        v: (cy - VENUE_MOSAIC_STADIUM_R_TOP_PX) / POKER_TABLE_IMG_H,
      }
    case 2:
      return {
        u: (cx + VENUE_MOSAIC_STADIUM_HALF_W_PX) / POKER_TABLE_IMG_W,
        v: cy / POKER_TABLE_IMG_H,
      }
    case 3:
      return {
        u: xRight / POKER_TABLE_IMG_W,
        v: (cy + VENUE_MOSAIC_STADIUM_R_BOTTOM_PX) / POKER_TABLE_IMG_H,
      }
    case 4:
      return { u: cx / POKER_TABLE_IMG_W, v: (cy + VENUE_MOSAIC_STADIUM_R_BOTTOM_PX) / POKER_TABLE_IMG_H }
    case 5:
      return {
        u: xLeft / POKER_TABLE_IMG_W,
        v: (cy + VENUE_MOSAIC_STADIUM_R_BOTTOM_PX) / POKER_TABLE_IMG_H,
      }
    case 6:
      return {
        u: (cx - VENUE_MOSAIC_STADIUM_HALF_W_PX) / POKER_TABLE_IMG_W,
        v: cy / POKER_TABLE_IMG_H,
      }
    case 7:
      return {
        u: xLeft / POKER_TABLE_IMG_W,
        v: (cy - VENUE_MOSAIC_STADIUM_R_TOP_PX) / POKER_TABLE_IMG_H,
      }
    default:
      return { ...VENUE_MOSAIC_FELT_CENTER_UV }
  }
}

/** Hole-card center between cup and felt center in artwork coordinates. */
export function mosaicStadiumHoleUV(
  seatIndex: number,
  inwardFrac = VENUE_MOSAIC_HOLE_INWARD_FRAC
): { u: number; v: number } {
  const cup = mosaicStadiumCupUV(seatIndex)
  return {
    u: cup.u + (VENUE_MOSAIC_FELT_CENTER_UV.u - cup.u) * inwardFrac,
    v: cup.v + (VENUE_MOSAIC_FELT_CENTER_UV.v - cup.v) * inwardFrac,
  }
}

/** Precomputed cup UVs (stable reference for tests and debugging). */
export const VENUE_MOSAIC_CUP_ANCHORS_UV: ReadonlyArray<{ readonly u: number; readonly v: number }> =
  Array.from({ length: VENUE_MOSAIC_SEAT_COUNT }, (_, i) => mosaicStadiumCupUV(i))

/** Precomputed hole UVs at {@link VENUE_MOSAIC_HOLE_INWARD_FRAC}. */
export const VENUE_MOSAIC_HOLE_ANCHORS_UV: ReadonlyArray<{ readonly u: number; readonly v: number }> =
  Array.from({ length: VENUE_MOSAIC_SEAT_COUNT }, (_, i) => mosaicStadiumHoleUV(i))

function mosaicAnchorToWrapperPct(
  anchor: { u: number; v: number },
  w: number,
  h: number
): { leftPct: number; topPct: number } {
  return imageNormToWrapperPct(anchor.u, anchor.v, w, h, POKER_TABLE_GRAPHIC_ASPECT)
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
 * Mosaic cupholder / seat-dot — stadium rail point mapped through `object-contain`
 * into wrapper percentages.
 */
export function mosaicSeatDotPct(
  seatIndex: number,
  _seatCount: number,
  w: number,
  h: number
): { leftPct: number; topPct: number } {
  return mosaicAnchorToWrapperPct(mosaicStadiumCupUV(seatIndex), w, h)
}

/** Hole-card pair center on felt just inside the rail, rotated toward the cup. */
export function mosaicSeatHoleLayout(
  seatIndex: number,
  _seatCount: number,
  w: number,
  h: number,
  inwardFrac?: number
): { leftPct: number; topPct: number; rotateDeg: number } {
  const cupUV = mosaicStadiumCupUV(seatIndex)
  const cup = mosaicAnchorToWrapperPct(cupUV, w, h)
  const center = venueMosaicFeltCenterPct(w, h)
  const holeUV =
    inwardFrac != null ? mosaicStadiumHoleUV(seatIndex, inwardFrac) : mosaicStadiumHoleUV(seatIndex)

  return {
    ...mosaicAnchorToWrapperPct(holeUV, w, h),
    rotateDeg: mosaicHoleRotateDeg(cup, center),
  }
}
