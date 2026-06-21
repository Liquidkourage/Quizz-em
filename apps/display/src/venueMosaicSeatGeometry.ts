import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

/** Authoring size for mosaic seat layout before ResizeObserver (16.5rem × 8.75rem @ 16px). */
export const MOSAIC_RING_FALLBACK_W_PX = 264
export const MOSAIC_RING_FALLBACK_H_PX = 140

/** Amber rail band inset inside the ring wrapper (matches {@link venueRailBoundsFrac}). */
const RAIL_INSET_TOP = 0.02
const RAIL_INSET_RIGHT = 0.02
const RAIL_INSET_BOTTOM = 0.02
const RAIL_INSET_LEFT = 0.02

const VENUE_FELT_INSET_TOP = 0.1
const VENUE_FELT_INSET_RIGHT = 0.06
const VENUE_FELT_INSET_BOTTOM = 0.13
const VENUE_FELT_INSET_LEFT = 0.06

/** Pull cupholder centers slightly inward from the rail midline (px at authoring scale). */
const MOSAIC_SEAT_RAIL_INSET_PX = 12

/** Hole cards at 12 / 6 — fraction from cup toward felt center. */
const MOSAIC_HOLE_CARD_INWARD_FRAC_POLE = 0.42
/** Hole cards at 3 / 9 — stay closer to the cup on the wider side span. */
const MOSAIC_HOLE_CARD_INWARD_FRAC_SIDE = 0.2
/** Extra inward nudge on diagonal arc seats — fanned cards clear the rail lip. */
const MOSAIC_HOLE_CARD_CORNER_INWARD_BUMP = 0.1

/** Blend pole → side inset by how horizontal the seat is (0 = 12/6, 1 = 3/9). */
function mosaicHoleCardInwardFrac(outX: number, outY: number): number {
  const len = Math.hypot(outX, outY) || 1
  const horizBias = Math.abs(outX) / len
  const base =
    MOSAIC_HOLE_CARD_INWARD_FRAC_POLE +
    (MOSAIC_HOLE_CARD_INWARD_FRAC_SIDE - MOSAIC_HOLE_CARD_INWARD_FRAC_POLE) * horizBias
  const cornerWeight = 4 * horizBias * (1 - horizBias)
  return base + MOSAIC_HOLE_CARD_CORNER_INWARD_BUMP * cornerWeight
}

/** Fan each card from the rail edge; wider spread toward the pot. */
export const MOSAIC_HOLE_CARD_FAN_DEG = 8

function mosaicRailRectPx(w: number, h: number) {
  const ww = w > 0 ? w : MOSAIC_RING_FALLBACK_W_PX
  const hh = h > 0 ? h : MOSAIC_RING_FALLBACK_H_PX
  return {
    left: ww * RAIL_INSET_LEFT,
    top: hh * RAIL_INSET_TOP,
    width: ww * (1 - RAIL_INSET_LEFT - RAIL_INSET_RIGHT),
    height: hh * (1 - RAIL_INSET_TOP - RAIL_INSET_BOTTOM),
    wrapW: ww,
    wrapH: hh,
  }
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

/** Stadium perimeter walk inside a local width × height box (px, origin top-left). */
function mosaicStadiumDotLocalPx(
  seatIndex: number,
  seatCount: number,
  ww: number,
  hh: number
): { x: number; y: number } {
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
  return { x, y }
}

function localPxToWrapperPct(
  x: number,
  y: number,
  rail: ReturnType<typeof mosaicRailRectPx>
): { leftPct: number; topPct: number } {
  return {
    leftPct: ((rail.left + x) / rail.wrapW) * 100,
    topPct: ((rail.top + y) / rail.wrapH) * 100,
  }
}

/**
 * Mosaic crawl: seat dots at equal arc length on the stadium rail band.
 * Seat 0 = top center; advances clockwise on screen.
 */
export function mosaicSeatDotPct(
  seatIndex: number,
  seatCount: number,
  w: number,
  h: number
): { leftPct: number; topPct: number } {
  const rail = mosaicRailRectPx(w, h)
  const local = mosaicStadiumDotLocalPx(seatIndex, seatCount, rail.width, rail.height)
  return localPxToWrapperPct(local.x, local.y, rail)
}

/** Hole-card pair center on felt just inside the rail, rotated toward the cup. */
export function mosaicSeatHoleLayout(
  seatIndex: number,
  seatCount: number,
  w: number,
  h: number,
  inwardFrac?: number
): { leftPct: number; topPct: number; rotateDeg: number } {
  const outer = mosaicSeatDotPct(seatIndex, seatCount, w, h)
  const center = venueMosaicFeltCenterPct()

  const rail = mosaicRailRectPx(w, h)
  const ox = (outer.leftPct / 100) * rail.wrapW
  const oy = (outer.topPct / 100) * rail.wrapH
  const ccx = (center.leftPct / 100) * rail.wrapW
  const ccy = (center.topPct / 100) * rail.wrapH
  const outX = ox - ccx
  const outY = oy - ccy
  const len = Math.hypot(outX, outY) || 1
  const frac = inwardFrac ?? mosaicHoleCardInwardFrac(outX, outY)
  const leftPct = outer.leftPct + (center.leftPct - outer.leftPct) * frac
  const topPct = outer.topPct + (center.topPct - outer.topPct) * frac
  const rotateDeg = (Math.atan2(outY / len, outX / len) * 180) / Math.PI + 90

  return { leftPct, topPct, rotateDeg }
}
