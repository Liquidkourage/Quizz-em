import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

/** Tables with at least one seated player — the aerial floor shows these only. */
export function populatedVenueTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated > 0)
}

export const VENUE_FLOOR_GRID_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

/** Horizontal gap between felts in a row (rem) — keep modest so tiles can grow. */
export const VENUE_FLOOR_CELL_GAP_REM = 0.6

function venueFloorBaseColumns(tableCount: number): number {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 1) return 1
  if (n <= 4) return 2
  if (n <= 9) return 3
  if (n <= 16) return 4
  return 5
}

export type VenueFloorHexLayout = {
  rowSizes: number[]
  maxInRow: number
}

/**
 * Honeycomb packing: alternate narrow / wide rows (e.g. 4-5-4-5 for 20 tables).
 * Narrow rows offset by half a cell so felts nest between the row above/below.
 */
export function venueFloorHexLayout(tableCount: number): VenueFloorHexLayout {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 0) {
    return { rowSizes: [], maxInRow: 0 }
  }
  if (n === 1) {
    return { rowSizes: [1], maxInRow: 1 }
  }

  const base = venueFloorBaseColumns(n)
  const narrow = base
  const wide = base + 1

  const rowSizes: number[] = []
  let remaining = n
  let useWide = false

  while (remaining > 0) {
    const cap = useWide ? wide : narrow
    const take = Math.min(cap, remaining)
    rowSizes.push(take)
    remaining -= take
    useWide = !useWide
  }

  if (rowSizes.length >= 2 && rowSizes[rowSizes.length - 1] === 1) {
    const last = rowSizes.pop()!
    const prev = rowSizes[rowSizes.length - 1]!
    if (prev + last <= wide) {
      rowSizes[rowSizes.length - 1] = prev + last
    } else {
      rowSizes.push(last)
    }
  }

  const maxInRow = Math.max(...rowSizes, 1)
  return { rowSizes, maxInRow }
}

export function chunkTilesForHexRows<T extends { tableNum: number }>(
  tiles: T[],
  rowSizes: number[]
): T[][] {
  const rows: T[][] = []
  let i = 0
  for (const size of rowSizes) {
    rows.push(tiles.slice(i, i + size))
    i += size
  }
  return rows
}

/** Narrow honeycomb rows shift right by half a cell. */
export function hexRowShouldOffset(rowIndex: number, rowSize: number, maxInRow: number): boolean {
  return rowIndex % 2 === 0 && rowSize < maxInRow
}

export function venueFloorShowdownBrief(maxInRow: number): boolean {
  return maxInRow > 5
}

export function venueFloorCompact(maxInRow: number): boolean {
  return maxInRow >= 5
}

/**
 * One felt width for the whole floor — sized for the busiest row so every table
 * is as large as possible while sharing a consistent scale.
 */
export function venueFloorUniformCellWidthCss(
  maxInRow: number,
  gapRem: number = VENUE_FLOOR_CELL_GAP_REM
): string {
  const cols = Math.max(1, maxInRow)
  const gaps = Math.max(0, cols - 1) * gapRem
  return `calc((100% - ${gaps}rem) / ${cols})`
}

/** Symmetric inset on offset honeycomb rows (half cell + half gap). */
export function venueFloorHexRowInsetCss(): string {
  return 'calc((var(--venue-floor-cell) + var(--venue-floor-gap)) / 2)'
}
