/**
 * Display venue mosaic seat geometry.
 * Core stadium UV / % anchors live in `@qhe/ui` so the player felt uses the same source of truth.
 * Broadcast-only rim / blind layout helpers stay here.
 */
export {
  MOSAIC_RING_FALLBACK_H_PX,
  MOSAIC_RING_FALLBACK_W_PX,
  mosaicSeatChipInwardFrac,
  mosaicSeatDotPct,
  mosaicSeatHoleInwardFrac,
  mosaicSeatHoleLayout,
  mosaicSeatLabelPct,
  mosaicStadiumCupUV,
  mosaicStadiumHoleUV,
} from '@qhe/ui'
export {
  MOSAIC_CUP_ANCHORS_UV as VENUE_MOSAIC_CUP_ANCHORS_UV,
  MOSAIC_FELT_CENTER_UV as VENUE_MOSAIC_FELT_CENTER_UV,
  MOSAIC_HOLE_ANCHORS_UV as VENUE_MOSAIC_HOLE_ANCHORS_UV,
  MOSAIC_HOLE_INWARD_FRAC as VENUE_MOSAIC_HOLE_INWARD_FRAC,
  MOSAIC_CORNER_ARC_DEG as VENUE_MOSAIC_CORNER_ARC_DEG,
  MOSAIC_SEAT_COUNT as VENUE_MOSAIC_SEAT_COUNT,
  mosaicFeltCenterPct as venueMosaicFeltCenterPct,
  mosaicSeatIndex,
} from '@qhe/ui'

import {
  MOSAIC_SEAT_COUNT,
  mosaicFeltCenterPct,
  mosaicSeatDotPct,
  mosaicSeatIndex,
} from '@qhe/ui'

/** Fan each card from the rail edge; wider spread toward the pot. */
export const MOSAIC_HOLE_CARD_FAN_DEG = 8

export function mosaicStadiumSeatThetaRad(seatIndex: number): number {
  return (mosaicSeatIndex(seatIndex) / MOSAIC_SEAT_COUNT) * 2 * Math.PI - Math.PI / 2
}

export type BroadcastSeatSideNudge = {
  /** Extra px along the rail tangent. */
  alongPx?: number
  /** Extra screen-space px (right +). */
  dx?: number
  /** Extra screen-space px (down +). */
  dy?: number
}

/** Per-seat broadcast puck tweaks (seat index 0 = 12 o'clock). */
export const BROADCAST_BLIND_SEAT_NUDGES: Partial<Record<number, BroadcastSeatSideNudge>> = {
  0: { alongPx: 10, dy: -6 },
  2: { alongPx: 14 },
}

export type BroadcastRimClusterLayout = {
  flexDirection: 'column' | 'column-reverse' | 'row' | 'row-reverse'
  gapRem: number
  /** When true, render bankroll before name in DOM (name still sits on the outer rim). */
  stackFirst: boolean
}

/** Semicircle arc seats — need extra vertical gap between rim name and bankroll. */
const BROADCAST_ARC_SEAT_INDEXES = new Set([1, 3, 5, 7])

/** Scaled gap from rim name to bankroll label (px). */
export function broadcastRimStackOffsetPx(seatIndex: number, stackFontPx: number): number {
  const i = mosaicSeatIndex(seatIndex)
  if (stackFontPx <= 0) return 0
  if (BROADCAST_ARC_SEAT_INDEXES.has(i)) return Math.round(stackFontPx * 1.42)
  if (i === 2 || i === 6) return Math.round(stackFontPx * 1.15)
  return Math.round(stackFontPx * 1.08)
}

/** Bankroll label — under the rim name; flat side seats stack vertically (+Y). */
export function broadcastRimStackPct(
  seatIndex: number,
  namePos: { leftPct: number; topPct: number },
  w: number,
  h: number,
  inwardFromNamePx: number
): { leftPct: number; topPct: number } {
  if (!(w > 0 && h > 0) || inwardFromNamePx <= 0) return namePos
  const i = mosaicSeatIndex(seatIndex)
  const center = mosaicFeltCenterPct(w, h)
  const cup = mosaicSeatDotPct(i, MOSAIC_SEAT_COUNT, w, h)
  const nameX = (namePos.leftPct / 100) * w
  const nameY = (namePos.topPct / 100) * h
  const cx = (center.leftPct / 100) * w
  const cy = (center.topPct / 100) * h

  const horizontalPullTowardCenter = (pullScale: number) => {
    const towardCenterX = cx - nameX
    return (
      Math.sign(towardCenterX || 1) *
      Math.min(Math.abs(towardCenterX) * pullScale, inwardFromNamePx * 0.3)
    )
  }

  if (i === 2 || i === 6) {
    return {
      leftPct: ((nameX + horizontalPullTowardCenter(0.055)) / w) * 100,
      topPct: ((nameY + inwardFromNamePx * 0.95) / h) * 100,
    }
  }

  if (BROADCAST_ARC_SEAT_INDEXES.has(i)) {
    const verticalSign = cup.topPct < center.topPct ? 1 : -1
    return {
      leftPct: ((nameX + horizontalPullTowardCenter(0.048)) / w) * 100,
      topPct: ((nameY + verticalSign * inwardFromNamePx) / h) * 100,
    }
  }

  let ix = cx - nameX
  let iy = cy - nameY
  const len = Math.hypot(ix, iy) || 1
  ix /= len
  iy /= len
  return {
    leftPct: ((nameX + ix * inwardFromNamePx) / w) * 100,
    topPct: ((nameY + iy * inwardFromNamePx) / h) * 100,
  }
}

/** @deprecated Flex cluster — prefer {@link broadcastRimStackPct} with separate anchors. */
export function broadcastRimClusterLayout(
  seatIndex: number,
  w: number,
  h: number
): BroadcastRimClusterLayout {
  const i = mosaicSeatIndex(seatIndex)
  const cup = mosaicSeatDotPct(i, MOSAIC_SEAT_COUNT, w, h)
  const center = mosaicFeltCenterPct(w, h)
  const absDx = Math.abs(cup.leftPct - center.leftPct)
  const absDy = Math.abs(cup.topPct - center.topPct)

  if (absDy > absDx) {
    return cup.topPct < center.topPct
      ? { flexDirection: 'column', gapRem: 0.12, stackFirst: false }
      : { flexDirection: 'column', gapRem: 0.12, stackFirst: true }
  }
  return cup.leftPct > center.leftPct
    ? { flexDirection: 'row-reverse', gapRem: 0.35, stackFirst: true }
    : { flexDirection: 'row', gapRem: 0.35, stackFirst: false }
}

/**
 * Broadcast BTN / blind lammers — nudge along the rail toward the next or previous seat.
 * Uses actual cup positions so offset matches the artwork, not a synthetic tangent from center.
 */
export function broadcastBlindMarkerPct(
  seatIndex: number,
  seatCount: number,
  w: number,
  h: number,
  markerSizePx: number,
  direction: 'clockwise' | 'counterclockwise' = 'clockwise'
): { leftPct: number; topPct: number } {
  const n = seatCount > 0 ? seatCount : MOSAIC_SEAT_COUNT
  const i = ((Math.floor(seatIndex) % n) + n) % n
  const cup = mosaicSeatDotPct(i, n, w, h)
  if (!(w > 0 && h > 0)) return cup

  const neighborSeat = direction === 'clockwise' ? (i + 1) % n : (i - 1 + n) % n
  const neighborCup = mosaicSeatDotPct(neighborSeat, n, w, h)
  const cupX = (cup.leftPct / 100) * w
  const cupY = (cup.topPct / 100) * h
  const neighborX = (neighborCup.leftPct / 100) * w
  const neighborY = (neighborCup.topPct / 100) * h
  let tx = neighborX - cupX
  let ty = neighborY - cupY
  const len = Math.hypot(tx, ty) || 1
  tx /= len
  ty /= len

  const nudge = BROADCAST_BLIND_SEAT_NUDGES[i]
  const sideOffsetPx = Math.max(34, Math.round(markerSizePx * 0.85)) + (nudge?.alongPx ?? 0)
  return {
    leftPct: ((cupX + tx * sideOffsetPx + (nudge?.dx ?? 0)) / w) * 100,
    topPct: ((cupY + ty * sideOffsetPx + (nudge?.dy ?? 0)) / h) * 100,
  }
}

export type BroadcastDensity = 'solo' | 'dual'

/** Max rim-name width — dual uses felt width, not viewport, so labels stay in-column. */
export function broadcastRimLabelMaxWidthPx(rimW: number, density: BroadcastDensity = 'solo'): number {
  if (!(rimW > 0)) return density === 'dual' ? 180 : 208
  if (density === 'dual') return Math.round(Math.min(rimW * 0.34, 180))
  return Math.round(Math.min(rimW * 0.38, 208))
}

/** Dual-table broadcast: anchor rim labels toward felt center so they never spill past the column. */
export function broadcastRimLabelTransform(
  namePos: { leftPct: number; topPct: number },
  rimW: number,
  rimH: number,
  density: BroadcastDensity = 'solo',
  verticalNudgePx = 0
): string {
  const ySolo = verticalNudgePx !== 0 ? `calc(-50% + ${verticalNudgePx}px)` : '-50%'
  if (density !== 'dual' || !(rimW > 0 && rimH > 0)) {
    return `translate(-50%, ${ySolo})`
  }

  const y = (base: string) =>
    verticalNudgePx !== 0 ? `calc(${base} + ${verticalNudgePx}px)` : base

  const center = mosaicFeltCenterPct(rimW, rimH)
  const dx = namePos.leftPct - center.leftPct
  const dy = namePos.topPct - center.topPct
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx > absDy * 0.72) {
    if (dx > 0) return `translate(-100%, ${y('-50%')})`
    return `translate(0%, ${y('-50%')})`
  }

  if (absDy > absDx * 1.15) {
    if (dy > 0) return `translate(-50%, ${y('-100%')})`
    return `translate(-50%, ${y('0%')})`
  }

  const x = dx > 0 ? '-92%' : '-8%'
  const yCorner = dy > 0 ? y('-92%') : y('-8%')
  return `translate(${x}, ${yCorner})`
}
