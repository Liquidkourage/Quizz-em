/**
 * Public-mosaic layout from the tile's own box.
 * Plaque size, how many side pots fit, and which rail a seat sits on
 * all come from pixels and the eight stadium seats — not from a table count.
 */

const PLAQUE_ASPECT = 2.5

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export type MosaicPlaqueMetrics = {
  widthPx: number
  heightPx: number
  gapPx: number
}

export type MosaicSeatRail = 'top' | 'bottom' | 'left' | 'right'

export type MosaicTileFrame = {
  topStatusPx: number
  bottomStatusPx: number
  plaqueLanePx: number
}

function tileBox(tileWidthPx: number, tileHeightPx: number): { w: number; h: number } {
  const w = tileWidthPx > 0 ? tileWidthPx : 720
  const h = tileHeightPx > 0 ? tileHeightPx : w * 0.68
  return { w, h }
}

/** Stadium rail for a seat. Seat 0 is 12 o'clock; the index wraps every eight chairs. */
export function mosaicSeatRail(seatIndex: number): MosaicSeatRail {
  const i = ((Math.floor(seatIndex) % 8) + 8) % 8
  if (i === 2) return 'right'
  if (i === 6) return 'left'
  if (i === 3 || i === 4 || i === 5) return 'bottom'
  return 'top'
}

/** One-line ALL-IN / FOLDED caption. Tracks the felt, and stays a caption. */
export function mosaicSeatStatusFontPx(feltWidthPx: number): number {
  const w = feltWidthPx > 0 ? feltWidthPx : 220
  const initials = Math.min(52, Math.max(30, w * 0.105))
  return Math.round(clamp(initials * 0.34, 11, 17))
}

export function mosaicStatusPillHeightPx(fontPx: number): number {
  const em = fontPx > 0 ? fontPx : 11
  return Math.ceil(em * 1.65)
}

/**
 * One plaque when `plaquesInRow` chips share the tile.
 * Height is a fraction of the tile so the felt stays the dominant shape.
 */
export function mosaicSidePotPlaqueMetrics(
  tileWidthPx: number,
  tileHeightPx: number,
  plaquesInRow: number,
): MosaicPlaqueMetrics {
  const count = Math.max(1, Math.floor(plaquesInRow))
  const { w, h } = tileBox(tileWidthPx, tileHeightPx)
  const gapPx = Math.round(clamp(w * 0.012, 4, 10))
  const inset = clamp(w * 0.045, 8, 22)
  const rowBudget = Math.max(0, w - inset * 2)
  const heightCap = clamp(Math.min(h * 0.15, w * 0.092), 18, 88)
  const share = (rowBudget - gapPx * Math.max(0, count - 1)) / count
  let height = Math.min(heightCap, Math.max(0, share) / PLAQUE_ASPECT)
  const shortest = Math.min(w, h)
  const floor = shortest >= 500 ? 60 : shortest >= 340 ? 40 : 0
  height = clamp(height, Math.min(floor, heightCap), heightCap)
  let width = height * PLAQUE_ASPECT
  const rowNeed = count * width + gapPx * Math.max(0, count - 1)
  if (rowNeed > rowBudget && rowBudget > 0) {
    const scale = rowBudget / rowNeed
    width *= scale
    height *= scale
  }
  return {
    widthPx: Math.max(1, Math.round(width)),
    heightPx: Math.max(1, Math.round(height)),
    gapPx,
  }
}

const READABLE_PLAQUE_MIN = 34

/** Largest chip that stays a caption under the felt. The felt's lane is unchanged. */
function readablePlaqueMaxPx(tileHeightPx: number): number {
  const h = tileHeightPx > 0 ? tileHeightPx : 480
  return Math.round(clamp(h * 0.145, 40, 80))
}

/**
 * Chip size for the amounts actually drawn.
 * Extra pots fall off the row once a chip would drop below a readable height.
 */
export function mosaicReadablePlaqueMetrics(
  tileWidthPx: number,
  tileHeightPx: number,
  plaquesInRow: number,
  laneBudgetPx: number,
): MosaicPlaqueMetrics {
  const count = Math.max(1, Math.floor(plaquesInRow))
  const { w, h } = tileBox(tileWidthPx, tileHeightPx)
  const gapPx = Math.round(clamp(w * 0.012, 4, 10))
  let height = readablePlaqueMaxPx(h)
  if (laneBudgetPx > 0) height = Math.min(height, laneBudgetPx)
  if (h > 0 && height > h * 0.2) {
    const minimumFits =
      READABLE_PLAQUE_MIN <= h * 0.22 && (laneBudgetPx <= 0 || laneBudgetPx >= READABLE_PLAQUE_MIN)
    height = minimumFits ? READABLE_PLAQUE_MIN : 0
  }
  if (height < READABLE_PLAQUE_MIN) height = 0
  void count
  return {
    widthPx: Math.max(1, Math.round(height * PLAQUE_ASPECT)),
    heightPx: Math.max(0, Math.round(height)),
    gapPx,
  }
}

/**
 * Amount size inside one chip. A long figure shrinks a little;
 * it does not collapse into a caption.
 */
export function mosaicSidePotAmountFontPx(heightPx: number, amountLabel: string): number {
  const h = heightPx > 0 ? heightPx : 36
  const chars = Math.max(1, amountLabel.trim().length)
  const preferred = h * 0.72
  const circle = preferred * 0.5
  const inner = h * PLAQUE_ASPECT * 0.8 - circle - h * 0.05
  const fitted = inner / (chars * 0.48)
  return Math.round(clamp(Math.min(preferred, fitted), Math.min(22, preferred), preferred))
}

/** Air between the header and top labels, and between bottom labels and plaques. */
export function mosaicAnnotationClearancePx(tileHeightPx: number): number {
  if (!(tileHeightPx > 0)) return 0
  return Math.round(clamp(tileHeightPx * 0.028, 8, 18))
}

export function mosaicSidePotOverflowLabel(hiddenCount: number): string {
  const n = Math.max(0, Math.floor(hiddenCount))
  return n > 0 ? `+${n} MORE` : ''
}

/** Width of the "+N MORE" chip, tall enough to match the row and wide enough for the words. */
export function mosaicSidePotOverflowWidthPx(
  metrics: MosaicPlaqueMetrics,
  hiddenCount: number,
): number {
  const label = mosaicSidePotOverflowLabel(hiddenCount)
  if (!label) return 0
  const fromLabel = label.length * metrics.heightPx * 0.38
  return Math.ceil(Math.max(metrics.heightPx * 1.7, fromLabel))
}

/**
 * How many established side pots fit on one row.
 * An unmeasured tile (width 0) keeps every pot until its box is known.
 */
export function mosaicSidePotsThatFit(
  sideCount: number,
  tileWidthPx: number,
  tileHeightPx = 0,
): number {
  const count = Math.max(0, Math.floor(sideCount))
  if (count === 0 || !(tileWidthPx > 0)) return count
  const { w } = tileBox(tileWidthPx, tileHeightPx)
  const inset = clamp(w * 0.045, 8, 22)
  const budget = w - inset * 2
  for (let fit = count; fit >= 1; fit -= 1) {
    const hidden = count - fit
    const slots = fit + (hidden > 0 ? 1 : 0)
    const box = mosaicReadablePlaqueMetrics(tileWidthPx, tileHeightPx, slots, 0)
    if (box.heightPx < READABLE_PLAQUE_MIN) continue
    const row =
      fit * box.widthPx +
      mosaicSidePotOverflowWidthPx(box, hidden) +
      Math.max(0, slots - 1) * box.gapPx
    if (row <= budget + 0.5) return fit
  }
  return 0
}

/**
 * Bands that do not depend on whether a side pot exists yet.
 * Top and bottom clear the status pills. The lane under the felt is where plaques sit.
 */
export function mosaicTileFrame(tileWidthPx: number, tileHeightPx: number): MosaicTileFrame {
  if (!(tileWidthPx > 0) || !(tileHeightPx > 0)) {
    return { topStatusPx: 0, bottomStatusPx: 0, plaqueLanePx: 0 }
  }
  const feltW = tileWidthPx * 0.9
  const initials = Math.min(52, Math.max(30, feltW * 0.105))
  const statusH = mosaicStatusPillHeightPx(mosaicSeatStatusFontPx(feltW))
  const badgeH = Math.ceil(initials * 0.42)
  const clearance = mosaicAnnotationClearancePx(tileHeightPx)
  const plaque = mosaicSidePotPlaqueMetrics(tileWidthPx, tileHeightPx, 1)
  let band = statusH + badgeH
  let lane = plaque.heightPx
  const cap = tileHeightPx * 0.4
  const used = band + clearance + band + clearance + lane
  if (used > cap && used > 0) {
    const room = Math.max(0, cap - clearance * 2)
    const bands = band + band
    if (room > bands) lane = Math.floor(room - bands)
    else {
      band = Math.floor(room / 2)
      lane = 0
    }
  }
  return {
    topStatusPx: Math.round(band + clearance),
    bottomStatusPx: Math.round(band + clearance),
    plaqueLanePx: Math.max(0, Math.round(lane)),
  }
}

/** Felt size that stays 17:10 inside the slot. A wide short slot narrows the felt. */
export function mosaicFeltFitPx(slotWidthPx: number, slotHeightPx: number): { widthPx: number; heightPx: number } {
  if (!(slotWidthPx > 0) || !(slotHeightPx > 0)) return { widthPx: 0, heightPx: 0 }
  const aspect = 17 / 10
  const widthPx = Math.min(slotWidthPx, slotHeightPx * aspect)
  return { widthPx: Math.round(widthPx), heightPx: Math.round(widthPx / aspect) }
}

/** Width that restores 17:10. A felt that is already that shape is left alone. */
export function mosaicFeltWidthPx(slotWidthPx: number, boxWidthPx: number, boxHeightPx: number): number | null {
  if (!(slotWidthPx > 0) || !(boxWidthPx > 0) || !(boxHeightPx > 0)) return null
  if (boxWidthPx / boxHeightPx <= 17 / 10 + 0.05) return null
  return mosaicFeltFitPx(slotWidthPx, boxHeightPx).widthPx
}

const FELT_AIR_PX = 16

/**
 * Space the felt yields around itself.
 * Side pots sit in the bottom corners on every card, so the center lane is given back.
 */
export function mosaicFeltReservePx(
  frame: MosaicTileFrame,
  tileWidthPx: number,
  tileHeightPx: number,
): { topPx: number; lanePx: number } {
  const fullLane = frame.bottomStatusPx + frame.plaqueLanePx
  const full = { topPx: frame.topStatusPx, lanePx: fullLane }
  if (!(tileWidthPx > 0) || !(tileHeightPx > 0) || !(fullLane > 0)) return full
  return { topPx: Math.min(frame.topStatusPx, FELT_AIR_PX), lanePx: 0 }
}

const CORNER_DOCK_AIR_PX = 8
/** Five and six tables give a little of the corner gap back to the felt. */
const FIVE_SIX_DOCK_GIVEBACK_PX = 16

/** Extra room under the felt on the counts that fill the card. Side pots sit in it. */
export function mosaicCornerDockPx(tableCount: number, chipHeightPx: number): number {
  const count = Math.floor(tableCount)
  const tight = (count >= 5 && count <= 8) || (count >= 13 && count <= 15)
  if (!tight || !(chipHeightPx > 0)) return 0
  const dock = Math.round(chipHeightPx + CORNER_DOCK_AIR_PX)
  if (count === 5 || count === 6) return Math.max(0, dock - FIVE_SIX_DOCK_GIVEBACK_PX)
  return dock
}

/** At most two corner readouts. A third side pot collapses into the overflow chip. */
export function mosaicSidePotCornerPlan(sideCount: number): { pots: number; overflow: number } {
  const count = Math.max(0, Math.floor(sideCount))
  if (count <= 2) return { pots: count, overflow: 0 }
  return { pots: 1, overflow: count - 1 }
}

/** Felt width that fills the stage left after the reserve, still at 17:10. */
export function mosaicFeltFillWidthPx(
  stageWidthPx: number,
  stageHeightPx: number,
  topPx: number,
  lanePx: number,
): number {
  return mosaicFeltFitPx(stageWidthPx, stageHeightPx - topPx - lanePx).widthPx
}
