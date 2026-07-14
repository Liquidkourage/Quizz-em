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

/** Player phone — name tags pushed past the rail so they never cover hole cards. */
export const STADIUM_PLAYER_NAME_LABEL_RADIAL = 1.14

/**
 * Player phone — hole cards just inside the rail at each seat.
 * Keep this high enough that multi-seat tables never form a card ring over the board.
 */
export const STADIUM_PLAYER_HOLE_CARDS_RADIAL = 0.9

/** Player phone — cupholders slightly inset from the rail. */
export const STADIUM_PLAYER_CUPHOLDER_RADIAL = 0.98

const CUPHOLDER_WIDTH_FRAC = 32 / STADIUM_REFERENCE_TABLE_WIDTH_PX
const HOLE_CARD_SCALE_AT_REFERENCE = 0.58
const HOLE_CARD_OVERLAP_AT_REFERENCE_PX = -30

/** Nominal honeycomb mosaic cell width (matches legacy `32 * mosaicScale` at ~220px). */
export const STADIUM_MOSAIC_REFERENCE_WIDTH_PX = 220

const MOSAIC_CUPHOLDER_PX_AT_REFERENCE = 32
const MOSAIC_HOLE_CARD_SCALE_AT_REFERENCE = 0.38
/** Hole-card width on mosaic felts at {@link STADIUM_MOSAIC_REFERENCE_WIDTH_PX}. */
const MOSAIC_HOLE_CARD_WIDTH_AT_REFERENCE = 20
/** Community board card width at {@link STADIUM_MOSAIC_REFERENCE_WIDTH_PX}. */
const MOSAIC_COMMUNITY_CARD_WIDTH_AT_REFERENCE = 28
/** Community cards read slightly larger than hole cards — not full felt width. */
const MOSAIC_COMMUNITY_TO_HOLE_WIDTH_RATIO = 1.28

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
  const proportional = w / STADIUM_MOSAIC_REFERENCE_WIDTH_PX
  if (density === 'hero') return clampMosaic(proportional, 1, 1.55)
  if (density === 'large') return clampMosaic(proportional, 1, 1.35)
  if (density === 'micro') return clampMosaic(w / 240, 0.82, 1.05)
  if (density === 'compact') return clampMosaic(w / 230, 0.88, 1.12)
  if (density === 'medium') return clampMosaic(w / 220, 0.92, 1.2)
  return clampMosaic(proportional, 1, 1.35)
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

/** Uniform hole-card width on venue mosaic felts (all seats on one table). */
export function stadiumMosaicHoleCardWidthPx(
  tableWidthPx: number,
  density?: StadiumMosaicDensity
): number {
  return Math.max(
    10,
    Math.round(MOSAIC_HOLE_CARD_WIDTH_AT_REFERENCE * stadiumMosaicScaleForWidth(tableWidthPx, density))
  )
}

/** Community board card width on venue mosaic felts. */
export function stadiumMosaicCommunityCardWidthPx(
  tableWidthPx: number,
  density?: StadiumMosaicDensity
): number {
  const w = tableWidthPx > 0 ? tableWidthPx : STADIUM_MOSAIC_REFERENCE_WIDTH_PX
  const scale = stadiumMosaicScaleForWidth(w, density)
  const fromLegacy = MOSAIC_COMMUNITY_CARD_WIDTH_AT_REFERENCE * scale
  if (density === 'hero') {
    return Math.max(14, Math.round(fromLegacy))
  }
  const fromHole =
    stadiumMosaicHoleCardWidthPx(w, density) * MOSAIC_COMMUNITY_TO_HOLE_WIDTH_RATIO
  return Math.max(14, Math.round(Math.max(fromLegacy, fromHole)))
}

/** Community board card height at 5:7 aspect. */
export function stadiumMosaicCommunityCardHeightPx(
  tableWidthPx: number,
  density?: StadiumMosaicDensity
): number {
  const w = stadiumMosaicCommunityCardWidthPx(tableWidthPx, density)
  return Math.max(18, Math.round((w * 7) / 5))
}

/** Hole-card height at 5:7 aspect. */
export function stadiumMosaicHoleCardHeightPx(
  tableWidthPx: number,
  density?: StadiumMosaicDensity
): number {
  const w = stadiumMosaicHoleCardWidthPx(tableWidthPx, density)
  return Math.max(14, Math.round((w * 7) / 5))
}

/** Horizontal overlap between fanned mosaic hole cards. */
export function stadiumMosaicHoleCardOverlapPx(cardWidthPx: number): number {
  return Math.max(3, Math.round(cardWidthPx * 0.36))
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

/** Phone / player app — readable felt at ~320–480px table width (not venue mosaic). */
export function stadiumPlayerCupholderSizePx(tableWidthPx: number): number {
  const w = tableWidthPx > 0 ? tableWidthPx : 360
  return Math.max(22, Math.round(w * 0.065))
}

/**
 * Hole-card scale for the player felt (`NumericPlayingCard` `small` = 64px).
 * Shrinks as seat count rises so pairs stay at their seats and leave the board clear.
 */
export function stadiumPlayerHoleCardScale(tableWidthPx: number, seatCount = 6): number {
  const w = tableWidthPx > 0 ? tableWidthPx : 360
  const n = Math.max(1, Math.floor(seatCount))
  const cardWFrac = n <= 2 ? 0.088 : n <= 4 ? 0.07 : n <= 6 ? 0.056 : 0.048
  const targetW = w * cardWFrac
  return Math.max(0.28, Math.min(0.62, targetW / 64))
}

/** Community board card size — five cards must fit inside the seat ring. */
export function stadiumPlayerCommunityCardSizePx(
  tableWidthPx: number,
  seatCount = 6
): { w: number; h: number } {
  const w = tableWidthPx > 0 ? tableWidthPx : 360
  const n = Math.max(1, Math.floor(seatCount))
  const boardFrac = n <= 2 ? 0.09 : n <= 4 ? 0.078 : 0.066
  const cardW = Math.max(22, Math.round(w * boardFrac))
  return { w: cardW, h: Math.max(30, Math.round((cardW * 7) / 5)) }
}

export type StadiumFeltLayout = 'default' | 'player'
