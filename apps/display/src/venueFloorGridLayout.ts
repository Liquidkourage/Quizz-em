import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

/** Tables with at least one seated player — the aerial floor shows these only. */
export function populatedVenueTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated > 0)
}

/** Max numbered felts the aerial floor grid targets on one viewport without scroll. */
export const VENUE_FLOOR_GRID_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

/**
 * Grid columns/rows so every populated table fits on screen (tournament aerial view).
 * Mirrors {@link showdownWallLayout} column breakpoints for consistency at 20 tables.
 */
export function venueFloorGridLayout(tableCount: number): {
  columns: number
  rows: number
  gapClass: string
} {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 0) {
    return { columns: 1, rows: 1, gapClass: 'gap-2' }
  }

  let columns: number
  if (n === 1) columns = 1
  else if (n <= 4) columns = 2
  else if (n <= 9) columns = 3
  else if (n <= 16) columns = 4
  else columns = 5

  const rows = Math.ceil(n / columns)
  const gapClass = n > 12 ? 'gap-1 sm:gap-1.5' : n > 6 ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-2.5'

  return { columns, rows, gapClass }
}
