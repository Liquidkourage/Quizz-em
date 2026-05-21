import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

/** Tables with at least one seated player — the aerial floor shows these only. */
export function populatedVenueTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated > 0)
}

export const VENUE_FLOOR_GRID_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

/**
 * Canonical venue floor: **A1 classic half-stagger** (banquet checkerboard).
 * 5×4 @ 20 tables; odd rows offset by half a column; uniform table size.
 */
export const VENUE_FLOOR_LAYOUT_A1 = 'checkerboard-half-stagger' as const

/** Aisle gap between checkerboard rows (rem). */
export const VENUE_FLOOR_ROW_GAP_REM = 1.25

/** Gap between tables within a row (rem). */
export const VENUE_FLOOR_CELL_GAP_REM = 1.45

/** Columns for A1 — same count on every full row (5 when 17–20 tables). */
export function venueBanquetColumns(tableCount: number): number {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 1) return 1
  if (n <= 4) return 2
  if (n <= 9) return 3
  if (n <= 16) return 4
  return 5
}

export type VenueBanquetLayout = {
  columns: number
  rowCount: number
}

export function venueBanquetLayout(tableCount: number): VenueBanquetLayout {
  const columns = venueBanquetColumns(tableCount)
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  const rowCount = n <= 0 ? 0 : Math.ceil(n / columns)
  return { columns, rowCount }
}

/** Slice tables into equal-width banquet rows (last row may be short — pad in UI). */
export function chunkTilesIntoBanquetRows<T>(
  tiles: T[],
  columns: number
): T[][] {
  const cols = Math.max(1, columns)
  const rows: T[][] = []
  for (let i = 0; i < tiles.length; i += cols) {
    rows.push(tiles.slice(i, i + cols))
  }
  return rows
}

/**
 * A1 checkerboard: 2 tracks per table; odd rows start on track 2 so the last table
 * needs one extra track (e.g. 5 tables ⇒ 11 tracks, not 10 — otherwise 10 / span 2 clips).
 */
export function banquetCheckerboardTrackCount(columns: number): number {
  const cols = Math.max(1, columns)
  return cols * 2 + 1
}

/**
 * `grid-column` for table `colIndex` in `rowIndex` (1-based line / span 2).
 * Even rows: 1, 3, 5… — odd rows: 2, 4, 6…
 */
export function banquetCheckerboardGridColumn(rowIndex: number, colIndex: number): string {
  const start = rowIndex % 2 === 1 ? colIndex * 2 + 2 : colIndex * 2 + 1
  return `${start} / span 2`
}

/** @deprecated Margin-based stagger did not render; use {@link banquetCheckerboardGridColumn}. */
export function banquetRowIsCheckerOffset(rowIndex: number): boolean {
  return rowIndex % 2 === 1
}

/** @deprecated */
export function banquetRowOffsetCss(columns: number): string {
  const cols = Math.max(1, columns)
  return `calc(50% / ${cols})`
}

export function venueFloorShowdownBrief(columns: number): boolean {
  return columns > 4
}

export function venueFloorCompact(columns: number): boolean {
  return columns >= 4
}

/** @deprecated Use {@link venueBanquetLayout}. */
export function venueFloorHexLayout(tableCount: number): {
  rowSizes: number[]
  maxInRow: number
} {
  const { columns, rowCount } = venueBanquetLayout(tableCount)
  const rowSizes = Array.from({ length: rowCount }, () => columns)
  return { rowSizes, maxInRow: columns }
}

/** @deprecated Use {@link chunkTilesIntoBanquetRows}. */
export function chunkTilesForHexRows<T>(
  tiles: T[],
  rowSizes: number[]
): T[][] {
  const columns = rowSizes[0] ?? 1
  return chunkTilesIntoBanquetRows(tiles, columns)
}
