import {
  imageNormToWrapperPct,
  POKER_TABLE_GRAPHIC_ASPECT,
} from './tableRimGeometry'

/** Venue / player tables always render eight physical chairs per felt. */
export const MOSAIC_SEAT_COUNT = 8

/** Authoring size for mosaic seat layout before ResizeObserver. */
export const MOSAIC_RING_FALLBACK_W_PX = 264
export const MOSAIC_RING_FALLBACK_H_PX = 140

/** `poker-table.svg` pixel size — stadium math is authored in this space, then normalized to u/v. */
const POKER_TABLE_IMG_W = 1262
const POKER_TABLE_IMG_H = 643

/**
 * Stadium table on the artwork: left semicircle + center rectangle + right semicircle.
 * `halfW` = center → side (3/9 o'clock); `rSide` = semicircle radius; flat span = halfW − rSide.
 * `rBottom` > `rTop` matches the artwork’s slightly deeper bottom rail.
 */
export const MOSAIC_FELT_CENTER_UV = { u: 0.5, v: 0.484 } as const

const MOSAIC_STADIUM_HALF_W_PX = 564.5
const MOSAIC_STADIUM_R_SIDE_PX = 253.8
const MOSAIC_STADIUM_R_TOP_PX = 253.8
const MOSAIC_STADIUM_R_BOTTOM_PX = 270.4

/** Half-width of the flat rectangle between the two semicircles. */
const MOSAIC_STADIUM_FLAT_HALF_PX = MOSAIC_STADIUM_HALF_W_PX - MOSAIC_STADIUM_R_SIDE_PX

/**
 * How far corner seats are rotated along each semicircle from 12 / 6 toward 3 / 9.
 * 0° = flat junction; 30° ≈ 1 / 5 / 7 / 11 o'clock; 15° splits the difference.
 */
export const MOSAIC_CORNER_ARC_DEG = 15

/** Hole-card pair inset from cup toward felt center (0 = on cup, 1 = at center). */
export const MOSAIC_HOLE_INWARD_FRAC = 0.22

/** Semicircle rail seats (1, 3, 5, 7) — default inward frac pulls assets too deep on the felt. */
const MOSAIC_ARC_SEAT_INDEXES = new Set([1, 3, 5, 7])

/** Seats 3 and 7 need the strongest rail-ward nudge. */
const MOSAIC_DEEP_INSET_SEAT_INDEXES = new Set([3, 7])

/** Point on a semicircle arc, nudged `arcDeg` from 12 (top) or 6 (bottom) toward the side. */
function semicircleCornerPointPx(
  scx: number,
  scy: number,
  r: number,
  anchor: 'top' | 'bottom',
  toward: 'right' | 'left'
): { x: number; y: number } {
  const rad = (MOSAIC_CORNER_ARC_DEG * Math.PI) / 180
  const sign = toward === 'right' ? 1 : -1
  if (anchor === 'top') {
    return {
      x: scx + sign * r * Math.sin(rad),
      y: scy - r * Math.cos(rad),
    }
  }
  return {
    x: scx + sign * r * Math.sin(rad),
    y: scy + r * Math.cos(rad),
  }
}

function mosaicSemicircleCupUV(
  scx: number,
  scy: number,
  r: number,
  anchor: 'top' | 'bottom',
  toward: 'right' | 'left'
): { u: number; v: number } {
  const { x, y } = semicircleCornerPointPx(scx, scy, r, anchor, toward)
  return { u: x / POKER_TABLE_IMG_W, v: y / POKER_TABLE_IMG_H }
}

export function mosaicSeatIndex(seatIndex: number): number {
  const n = MOSAIC_SEAT_COUNT
  return ((Math.floor(seatIndex) % n) + n) % n
}

/** Chip stack anchor — fraction from cup toward felt center (lower = closer to rail). */
export function mosaicSeatChipInwardFrac(seatIndex: number): number {
  const i = mosaicSeatIndex(seatIndex)
  if (MOSAIC_DEEP_INSET_SEAT_INDEXES.has(i)) return 0.02
  if (i === 2 || i === 6) return 0.07
  if (MOSAIC_ARC_SEAT_INDEXES.has(i)) return 0.08
  return 0.28
}

/** Hole-card anchor — fraction from cup toward felt center (lower = closer to rail). */
export function mosaicSeatHoleInwardFrac(seatIndex: number): number {
  const i = mosaicSeatIndex(seatIndex)
  if (MOSAIC_DEEP_INSET_SEAT_INDEXES.has(i)) return 0.04
  if (i === 2 || i === 6) return 0.1
  if (MOSAIC_ARC_SEAT_INDEXES.has(i)) return 0.12
  return MOSAIC_HOLE_INWARD_FRAC
}

/**
 * Cupholder on the stadium rail — each of the eight authored points from the
 * semicircle + rectangle model, then normalized to artwork u/v.
 *
 * Seat 0 = rect top · 1 R~12:30 · 2 R3 · 3 R~5:30 · 4 rect bottom · 5 L~6:30 · 6 L9 · 7 L~11:30
 */
export function mosaicStadiumCupUV(seatIndex: number): { u: number; v: number } {
  const cx = MOSAIC_FELT_CENTER_UV.u * POKER_TABLE_IMG_W
  const cy = MOSAIC_FELT_CENTER_UV.v * POKER_TABLE_IMG_H
  const flat = MOSAIC_STADIUM_FLAT_HALF_PX
  const xRight = cx + flat
  const xLeft = cx - flat

  switch (mosaicSeatIndex(seatIndex)) {
    case 0:
      return { u: cx / POKER_TABLE_IMG_W, v: (cy - MOSAIC_STADIUM_R_TOP_PX) / POKER_TABLE_IMG_H }
    case 1:
      return mosaicSemicircleCupUV(xRight, cy, MOSAIC_STADIUM_R_TOP_PX, 'top', 'right')
    case 2:
      return {
        u: (cx + MOSAIC_STADIUM_HALF_W_PX) / POKER_TABLE_IMG_W,
        v: cy / POKER_TABLE_IMG_H,
      }
    case 3:
      return mosaicSemicircleCupUV(xRight, cy, MOSAIC_STADIUM_R_BOTTOM_PX, 'bottom', 'right')
    case 4:
      return { u: cx / POKER_TABLE_IMG_W, v: (cy + MOSAIC_STADIUM_R_BOTTOM_PX) / POKER_TABLE_IMG_H }
    case 5:
      return mosaicSemicircleCupUV(xLeft, cy, MOSAIC_STADIUM_R_BOTTOM_PX, 'bottom', 'left')
    case 6:
      return {
        u: (cx - MOSAIC_STADIUM_HALF_W_PX) / POKER_TABLE_IMG_W,
        v: cy / POKER_TABLE_IMG_H,
      }
    case 7:
      return mosaicSemicircleCupUV(xLeft, cy, MOSAIC_STADIUM_R_TOP_PX, 'top', 'left')
    default:
      return { ...MOSAIC_FELT_CENTER_UV }
  }
}

/** Hole-card center between cup and felt center in artwork coordinates. */
export function mosaicStadiumHoleUV(
  seatIndex: number,
  inwardFrac = MOSAIC_HOLE_INWARD_FRAC
): { u: number; v: number } {
  const cup = mosaicStadiumCupUV(seatIndex)
  return {
    u: cup.u + (MOSAIC_FELT_CENTER_UV.u - cup.u) * inwardFrac,
    v: cup.v + (MOSAIC_FELT_CENTER_UV.v - cup.v) * inwardFrac,
  }
}

/** Precomputed cup UVs (stable reference for tests and debugging). */
export const MOSAIC_CUP_ANCHORS_UV: ReadonlyArray<{ readonly u: number; readonly v: number }> =
  Array.from({ length: MOSAIC_SEAT_COUNT }, (_, i) => mosaicStadiumCupUV(i))

/** Precomputed hole UVs at {@link MOSAIC_HOLE_INWARD_FRAC}. */
export const MOSAIC_HOLE_ANCHORS_UV: ReadonlyArray<{ readonly u: number; readonly v: number }> =
  Array.from({ length: MOSAIC_SEAT_COUNT }, (_, i) => mosaicStadiumHoleUV(i))

function mosaicAnchorToWrapperPct(
  anchor: { u: number; v: number },
  w: number,
  h: number
): { leftPct: number; topPct: number } {
  return imageNormToWrapperPct(anchor.u, anchor.v, w, h, POKER_TABLE_GRAPHIC_ASPECT)
}

/** Green felt center in ring wrapper % (0–100). */
export function mosaicFeltCenterPct(
  w = MOSAIC_RING_FALLBACK_W_PX,
  h = MOSAIC_RING_FALLBACK_H_PX
): { leftPct: number; topPct: number } {
  return mosaicAnchorToWrapperPct(MOSAIC_FELT_CENTER_UV, w, h)
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
  const center = mosaicFeltCenterPct(w, h)
  const holeUV =
    inwardFrac != null ? mosaicStadiumHoleUV(seatIndex, inwardFrac) : mosaicStadiumHoleUV(seatIndex)

  return {
    ...mosaicAnchorToWrapperPct(holeUV, w, h),
    rotateDeg: mosaicHoleRotateDeg(cup, center),
  }
}

/**
 * Player name label just outside the cupholder — outward from felt center through the cup.
 * Matches {@link mosaicSeatDotPct} so labels track the artwork.
 */
export function mosaicSeatLabelPct(
  seatIndex: number,
  w: number,
  h: number,
  outwardPx: number
): { leftPct: number; topPct: number } {
  const cup = mosaicSeatDotPct(seatIndex, MOSAIC_SEAT_COUNT, w, h)
  if (!(w > 0 && h > 0) || outwardPx <= 0) return cup

  const center = mosaicFeltCenterPct(w, h)
  const cupX = (cup.leftPct / 100) * w
  const cupY = (cup.topPct / 100) * h
  const centerX = (center.leftPct / 100) * w
  const centerY = (center.topPct / 100) * h
  const dx = cupX - centerX
  const dy = cupY - centerY
  const len = Math.hypot(dx, dy) || 1
  const lx = cupX + (dx / len) * outwardPx
  const ly = cupY + (dy / len) * outwardPx
  return { leftPct: (lx / w) * 100, topPct: (ly / h) * 100 }
}
