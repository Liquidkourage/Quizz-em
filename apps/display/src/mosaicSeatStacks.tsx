import {
  ChipMark,
  stadiumMosaicCommunityCardHeightPx,
  stadiumMosaicCommunityCardWidthPx,
  type StadiumMosaicDensity,
} from '@qhe/ui'
import { formatVenueBankroll, formatVenueBankrollDigits } from './venueLeaderboard'
import {
  mosaicSeatDotPct,
  mosaicSeatHoleInwardFrac,
  mosaicSeatStackLayout,
  venueMosaicFeltCenterPct,
  type MosaicSeatStackLayout,
} from './venueMosaicSeatGeometry'

/** Lobby and breaks only. The question beat is the felt just before hole cards. */
export function mosaicShowsSeatStacks(phase: string | null | undefined): boolean {
  const ph = String(phase ?? '').trim().toLowerCase()
  return ph === 'lobby' || ph === 'intermission'
}

function feltWidthPx(tableWidthPx: number): number {
  return tableWidthPx > 0 ? tableWidthPx : 220
}

/** Two-letter seat mark, sized from the felt so it reads across the room. */
export function mosaicSeatInitialFontPx(tableWidthPx: number): number {
  const w = feltWidthPx(tableWidthPx)
  return Math.round(Math.min(52, Math.max(30, w * 0.105)))
}

/** Street cards on the mosaic felt, at least as wide and tall as the initials. */
export function mosaicStreetCardBoxPx(
  tableWidthPx: number,
  density?: StadiumMosaicDensity,
): { widthPx: number; heightPx: number } {
  const initials = mosaicSeatInitialFontPx(tableWidthPx)
  const widthPx = Math.max(stadiumMosaicCommunityCardWidthPx(tableWidthPx, density), initials)
  const heightPx = Math.max(
    stadiumMosaicCommunityCardHeightPx(tableWidthPx, density),
    Math.round((widthPx * 7) / 5),
  )
  return { widthPx, heightPx }
}

/** Half-width of a two-letter initial, including the dark stroke, in em. */
const MOSAIC_INITIAL_HALF_EM = 0.78

/**
 * Side chairs sit on the card edge. Shift their initials toward the felt
 * just enough that the letters stay inside the card.
 */
export function mosaicSeatInitialShiftXPx(
  seatIndex: number,
  ringW: number,
  ringH: number,
  fontPx: number,
): number {
  const i = ((Math.floor(seatIndex) % 8) + 8) % 8
  if ((i !== 2 && i !== 6) || !(ringW > 0) || !(fontPx > 0)) return 0
  const cup = mosaicSeatDotPct(i, 8, ringW, ringH > 0 ? ringH : ringW)
  const cupX = (cup.leftPct / 100) * ringW
  const half = fontPx * MOSAIC_INITIAL_HALF_EM
  const pad = 2
  if (i === 6) {
    const overflow = pad + half - cupX
    return overflow > 0 ? Math.ceil(overflow) : 0
  }
  const overflow = cupX + half + pad - ringW
  return overflow > 0 ? -Math.ceil(overflow) : 0
}

/** Hole cards stay outside the center board, and past the initials when the felt allows. */
const MOSAIC_HOLE_CLEAR_FRAC_CAP = 0.38

/**
 * Hole-card inset that starts the pair past the initials.
 * The largest letters spill inward from the cup and would cover a pair parked on the rail.
 */
export function mosaicHoleClearOfInitialsFrac(seatIndex: number, ringW: number, ringH: number): number {
  const base = mosaicSeatHoleInwardFrac(seatIndex)
  if (!(ringW > 0) || !(ringH > 0)) return base
  const font = mosaicSeatInitialFontPx(ringW)
  const cup = mosaicSeatDotPct(seatIndex, 8, ringW, ringH)
  const center = venueMosaicFeltCenterPct(ringW, ringH)
  const cupX = (cup.leftPct / 100) * ringW
  const cupY = (cup.topPct / 100) * ringH
  const dx = (center.leftPct / 100) * ringW - cupX
  const dy = (center.topPct / 100) * ringH - cupY
  const dist = Math.hypot(dx, dy)
  if (!(dist > 0)) return base
  const ux = dx / dist
  const uy = dy / dist
  const shiftX = mosaicSeatInitialShiftXPx(seatIndex, ringW, ringH, font)
  const inwardMost = shiftX * ux + Math.abs(ux) * font * MOSAIC_INITIAL_HALF_EM + Math.abs(uy) * font * 0.52
  const needed = (inwardMost + 8) / dist
  return Math.min(MOSAIC_HOLE_CLEAR_FRAC_CAP, Math.max(base, needed))
}

/** Em width of a gold amount such as $1,000, including the chip mark. */
export const MOSAIC_STACK_LABEL_EM = 3.3

/** Space between neighboring stack amounts on a full felt. */
const CROWDED_STACK_GAP_PX = 4

const CROWDED_STACK_SLOT: ReadonlyArray<{ col: number; edge: 'top' | 'bottom' | 'left' | 'right' }> = [
  { col: 1, edge: 'top' },
  { col: 2, edge: 'top' },
  { col: 0, edge: 'right' },
  { col: 2, edge: 'bottom' },
  { col: 1, edge: 'bottom' },
  { col: 0, edge: 'bottom' },
  { col: 0, edge: 'left' },
  { col: 0, edge: 'top' },
]

/** Five or more stacks on one felt — each amount has to fit between its neighbors. */
const MOSAIC_CROWDED_SEAT_COUNT = 5

type StackRect = { x: number; y: number; width: number; height: number }

function cupPoint(seat: number, w: number, h: number): { x: number; y: number } {
  const cup = mosaicSeatDotPct(seat, 8, w, h)
  return { x: (cup.leftPct / 100) * w, y: (cup.topPct / 100) * h }
}

function stackLabelRect(
  layout: MosaicSeatStackLayout,
  w: number,
  h: number,
  labelW: number,
  labelH: number,
): StackRect {
  const anchorX = (layout.leftPct / 100) * w
  const anchorY = (layout.topPct / 100) * h
  const xPin = layout.transform.includes('translate(0,')
    ? 0
    : layout.transform.includes('translate(-100%')
      ? -labelW
      : -labelW / 2
  const yPin = layout.transform.includes(', 0)')
    ? 0
    : layout.transform.includes(', -100%)')
      ? -labelH
      : -labelH / 2
  return { x: anchorX + xPin, y: anchorY + yPin, width: labelW, height: labelH }
}

function rectsMeet(a: StackRect, b: StackRect, gap: number): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  )
}

type CrowdedFrame = {
  topY: number
  bottomY: number
  leftX: number
  rightX: number
  colW: number
  cy: number
}

/** Inner green where a full ring of amounts can sit, just inside the initials. */
function crowdedStackFrame(w: number, h: number): CrowdedFrame | null {
  if (!(w > 0 && h > 0)) return null
  const initial = mosaicSeatInitialFontPx(w)
  const gap = CROWDED_STACK_GAP_PX
  const topY = Math.max(cupPoint(0, w, h).y, cupPoint(1, w, h).y, cupPoint(7, w, h).y) + initial * 0.58 + gap
  const bottomY = Math.min(cupPoint(3, w, h).y, cupPoint(4, w, h).y, cupPoint(5, w, h).y) - initial * 0.58 - gap
  const left = cupPoint(6, w, h)
  const right = cupPoint(2, w, h)
  const leftX = left.x + mosaicSeatInitialShiftXPx(6, w, h, initial) + initial * MOSAIC_INITIAL_HALF_EM + gap
  const rightX = right.x + mosaicSeatInitialShiftXPx(2, w, h, initial) - initial * MOSAIC_INITIAL_HALF_EM - gap
  const center = venueMosaicFeltCenterPct(w, h)
  const colW = (rightX - leftX) / 3
  if (!(colW > 0) || !(bottomY > topY)) return null
  return { topY, bottomY, leftX, rightX, colW, cy: (center.topPct / 100) * h }
}

/** Full-table amount: centered in the pocket inside that seat's initials. */
export function mosaicCrowdedStackLayout(seatIndex: number, w: number, h: number): MosaicSeatStackLayout {
  const seat = ((Math.floor(seatIndex) % 8) + 8) % 8
  const frame = crowdedStackFrame(w, h)
  const slot = CROWDED_STACK_SLOT[seat] ?? CROWDED_STACK_SLOT[0]!
  if (!frame) return { leftPct: 50, topPct: 50, transform: 'translate(-50%, -50%)' }
  if (slot.edge === 'left' || slot.edge === 'right') {
    const x = slot.edge === 'left' ? frame.leftX : frame.rightX
    const transform = slot.edge === 'left' ? 'translate(0, -50%)' : 'translate(-100%, -50%)'
    return { leftPct: (x / w) * 100, topPct: (frame.cy / h) * 100, transform }
  }
  const x = frame.leftX + frame.colW * (slot.col + 0.5)
  const y = slot.edge === 'top' ? frame.topY : frame.bottomY
  const transform = slot.edge === 'top' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
  return { leftPct: (x / w) * 100, topPct: (y / h) * 100, transform }
}

function initialsRect(seat: number, w: number, h: number): StackRect {
  const initial = mosaicSeatInitialFontPx(w)
  const cup = cupPoint(seat, w, h)
  const shift = mosaicSeatInitialShiftXPx(seat, w, h, initial)
  return {
    x: cup.x + shift - initial * MOSAIC_INITIAL_HALF_EM,
    y: cup.y - initial * 0.52,
    width: initial * MOSAIC_INITIAL_HALF_EM * 2,
    height: initial * 1.04,
  }
}

function rectInsideFelt(box: StackRect, w: number, h: number): boolean {
  return box.x >= 1 && box.y >= 1 && box.x + box.width <= w - 1 && box.y + box.height <= h - 1
}

function hitsLaterStack(box: StackRect, boxes: StackRect[], index: number): boolean {
  for (let j = index + 1; j < boxes.length; j++) {
    if (rectsMeet(box, boxes[j]!, 2)) return true
  }
  return false
}

function crowdedStacksClear(w: number, h: number, fontPx: number): boolean {
  const frame = crowdedStackFrame(w, h)
  if (!frame || !(fontPx > 0)) return false
  const labelW = fontPx * MOSAIC_STACK_LABEL_EM
  const boxes = Array.from({ length: 8 }, (_, seat) =>
    stackLabelRect(mosaicCrowdedStackLayout(seat, w, h), w, h, labelW, fontPx),
  )
  const center = venueMosaicFeltCenterPct(w, h)
  const pot: StackRect = {
    x: (center.leftPct / 100) * w - 12,
    y: (center.topPct / 100) * h - 10,
    width: 24,
    height: 20,
  }
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]!
    if (!rectInsideFelt(box, w, h)) return false
    if (rectsMeet(box, pot, 0) || rectsMeet(box, initialsRect(i, w, h), 1)) return false
    if (hitsLaterStack(box, boxes, i)) return false
  }
  return true
}

/** Stack amount on the green. A full table uses the largest size that still has its own pocket. */
export function mosaicSeatStackFontPx(tableWidthPx: number, filledSeats = 0, tableHeightPx?: number): number {
  const w = feltWidthPx(tableWidthPx)
  const room = Math.round(Math.min(36, Math.max(24, w * 0.072)))
  if (filledSeats < MOSAIC_CROWDED_SEAT_COUNT) return room
  const h = tableHeightPx && tableHeightPx > 0 ? tableHeightPx : Math.round(w * (140 / 264))
  for (let font = room; font >= 16; font--) {
    if (crowdedStacksClear(w, h, font)) return font
  }
  return 16
}

/** Sparse tables keep the inward amount. A full table uses the pocket inside each initial. */
export function mosaicSeatStackPlacement(
  seatIndex: number,
  w: number,
  h: number,
  filledSeats: number,
  clearPx: number,
): MosaicSeatStackLayout {
  if (filledSeats >= MOSAIC_CROWDED_SEAT_COUNT) return mosaicCrowdedStackLayout(seatIndex, w, h)
  return mosaicSeatStackLayout(seatIndex, w, h, clearPx)
}

/** Rail-facing edge of the amount, past the initials that spill off the cup. */
export function mosaicSeatStackClearPx(cupSizePx: number, initialFontPx: number): number {
  const cup = Math.max(8, Math.round(cupSizePx))
  const pastGlyph = Math.round(initialFontPx * 0.72 + 8)
  return Math.max(cup, pastGlyph)
}

export function MosaicSeatStackAmount({
  name,
  amount,
  fontPx,
}: {
  name: string
  amount: number
  fontPx: number
}) {
  const label = formatVenueBankroll(amount)
  const digits = formatVenueBankrollDigits(amount)
  return (
    <span
      className="vfd-mosaic-seat-stack vfd-mosaic-stack whitespace-nowrap leading-none"
      style={{ fontSize: `${Math.max(1, Math.round(fontPx))}px` }}
      data-mosaic-seat-stack=""
      aria-label={`${name} stack ${label}`}
    >
      <span className="vfd-mosaic-dollar vfd-mosaic-dollar--live">
        <span className="vfd-mosaic-dollar-sign" aria-hidden>
          <ChipMark />
        </span>
        <span className="vfd-mosaic-dollar-digits">{digits}</span>
      </span>
    </span>
  )
}
