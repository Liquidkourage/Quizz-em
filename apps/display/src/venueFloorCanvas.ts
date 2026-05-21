import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

/** Tables with at least one seated player — the aerial floor shows these only. */
export function populatedVenueTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated > 0)
}

export const VENUE_FLOOR_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

export type VenueFloorAnchor = {
  /** Center point, percent of canvas width. */
  leftPct: number
  /** Center point, percent of canvas height. */
  topPct: number
  rotateDeg: number
  scale: number
}

/**
 * Fixed “room map” for numbered tables 1–20 — each table always returns to the
 * same spot on the canvas (non-orthogonal, hand-tuned for spread + overlap avoidance).
 */
export const VENUE_FLOOR_TABLE_ANCHORS: readonly VenueFloorAnchor[] = [
  { leftPct: 10, topPct: 19, rotateDeg: -5.5, scale: 1 },
  { leftPct: 25, topPct: 10, rotateDeg: 4, scale: 0.98 },
  { leftPct: 41, topPct: 15, rotateDeg: -2.5, scale: 1 },
  { leftPct: 57, topPct: 9, rotateDeg: 5, scale: 0.97 },
  { leftPct: 73, topPct: 14, rotateDeg: -3.5, scale: 1 },
  { leftPct: 85, topPct: 24, rotateDeg: 6, scale: 0.96 },
  { leftPct: 7, topPct: 39, rotateDeg: 3, scale: 1 },
  { leftPct: 22, topPct: 35, rotateDeg: -4.5, scale: 0.98 },
  { leftPct: 38, topPct: 43, rotateDeg: 1.5, scale: 1 },
  { leftPct: 54, topPct: 37, rotateDeg: -5, scale: 0.97 },
  { leftPct: 69, topPct: 41, rotateDeg: 3.5, scale: 1 },
  { leftPct: 82, topPct: 51, rotateDeg: -2, scale: 0.96 },
  { leftPct: 13, topPct: 57, rotateDeg: -3, scale: 1 },
  { leftPct: 29, topPct: 63, rotateDeg: 5.5, scale: 0.98 },
  { leftPct: 45, topPct: 55, rotateDeg: -1, scale: 1 },
  { leftPct: 61, topPct: 61, rotateDeg: 4.5, scale: 0.97 },
  { leftPct: 76, topPct: 67, rotateDeg: -4, scale: 1 },
  { leftPct: 19, topPct: 77, rotateDeg: 2.5, scale: 0.98 },
  { leftPct: 47, topPct: 73, rotateDeg: -6, scale: 1 },
  { leftPct: 70, topPct: 79, rotateDeg: 3, scale: 0.97 },
] as const

export function venueFloorAnchorForTable(tableNum: number): VenueFloorAnchor | null {
  const i = tableNum - 1
  if (i < 0 || i >= VENUE_FLOOR_TABLE_ANCHORS.length) return null
  return VENUE_FLOOR_TABLE_ANCHORS[i]!
}

/** Felt width on the canvas — fewer tables get larger tiles. */
export function venueFloorTileWidthCss(populatedCount: number): string {
  const n = Math.max(1, Math.min(VENUE_FLOOR_MAX_TABLES, populatedCount))
  if (n <= 4) return 'clamp(6.25rem, 14vw, 10.5rem)'
  if (n <= 8) return 'clamp(5.5rem, 11.5vw, 9.25rem)'
  if (n <= 14) return 'clamp(4.75rem, 9.5vw, 8.25rem)'
  return 'clamp(4.1rem, 8vw, 7.35rem)'
}

export function venueFloorTileTransform(anchor: VenueFloorAnchor): string {
  return `translate(-50%, -50%) rotate(${anchor.rotateDeg}deg) scale(${anchor.scale})`
}

export function venueFloorShowdownBrief(populatedCount: number): boolean {
  return populatedCount > 6
}

export function venueFloorCompact(populatedCount: number): boolean {
  return populatedCount > 8
}
