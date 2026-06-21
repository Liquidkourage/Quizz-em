import { capsuleBoundaryHitPx } from './tableRimGeometry'

/** Authoring table width where hero cupholders are 32px and hole cards use scale 0.58. */
export const STADIUM_REFERENCE_TABLE_WIDTH_PX = 1134

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

/** Blind / dealer badges between cupholders and hole cards. */
export const STADIUM_BLIND_BADGE_RADIAL = 0.92

/** Chip stacks on the felt between hole cards and the pot. */
export const STADIUM_CHIP_STACK_RADIAL = 0.58

/** Player name / bankroll tags just outside the rail. */
export const STADIUM_NAME_LABEL_RADIAL = 1.06

const CUPHOLDER_WIDTH_FRAC = 32 / STADIUM_REFERENCE_TABLE_WIDTH_PX
const HOLE_CARD_SCALE_AT_REFERENCE = 0.58
const HOLE_CARD_OVERLAP_AT_REFERENCE_PX = -30

/** Nominal honeycomb mosaic cell width (matches legacy `32 * mosaicScale` at ~220px). */
export const STADIUM_MOSAIC_REFERENCE_WIDTH_PX = 220

const MOSAIC_CUPHOLDER_PX_AT_REFERENCE = 32
const MOSAIC_HOLE_CARD_SCALE_AT_REFERENCE = 0.38

export type StadiumMosaicDensity = 'hero' | 'large' | 'medium' | 'compact' | 'micro'

function clampMosaic(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Legacy mosaic scale factor from measured felt width and floor density tier. */
export function stadiumMosaicScaleForWidth(
  tableWidthPx: number,
  density?: StadiumMosaicDensity
): number {
  const w = tableWidthPx > 0 ? tableWidthPx : STADIUM_MOSAIC_REFERENCE_WIDTH_PX
  if (density === 'micro') return clampMosaic(w / 240, 0.82, 1.05)
  if (density === 'compact') return clampMosaic(w / 230, 0.88, 1.12)
  if (density === 'medium') return clampMosaic(w / 220, 0.92, 1.2)
  return clampMosaic(w / STADIUM_MOSAIC_REFERENCE_WIDTH_PX, 1, 1.35)
}

/** Cupholder diameter on venue mosaic / honeycomb felts. */
export function stadiumMosaicCupholderSizePx(
  tableWidthPx: number,
  density?: StadiumMosaicDensity
): number {
  return Math.max(
    10,
    Math.round(MOSAIC_CUPHOLDER_PX_AT_REFERENCE * stadiumMosaicScaleForWidth(tableWidthPx, density))
  )
}

/** Hole-card scale on venue mosaic felts (`NumericPlayingCard` `small`). */
export function stadiumMosaicHoleCardScale(
  tableWidthPx: number,
  density?: StadiumMosaicDensity
): number {
  return MOSAIC_HOLE_CARD_SCALE_AT_REFERENCE * stadiumMosaicScaleForWidth(tableWidthPx, density)
}

/** Cupholder diameter proportional to rendered table width. */
export function stadiumCupholderSizePx(tableWidthPx: number): number {
  const w = tableWidthPx > 0 ? tableWidthPx : STADIUM_REFERENCE_TABLE_WIDTH_PX
  return Math.max(8, Math.round(w * CUPHOLDER_WIDTH_FRAC))
}

/** Scale for {@link NumericPlayingCard} `small` on the felt at this table width. */
export function stadiumHoleCardScale(tableWidthPx: number): number {
  const w = tableWidthPx > 0 ? tableWidthPx : STADIUM_REFERENCE_TABLE_WIDTH_PX
  return HOLE_CARD_SCALE_AT_REFERENCE * (w / STADIUM_REFERENCE_TABLE_WIDTH_PX)
}

/** Horizontal overlap between the two hole cards at the given scale. */
export function stadiumHoleCardOverlapPx(scale: number): number {
  return Math.round(
    HOLE_CARD_OVERLAP_AT_REFERENCE_PX * (scale / HOLE_CARD_SCALE_AT_REFERENCE)
  )
}
