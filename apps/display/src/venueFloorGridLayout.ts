import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

/** Tables with at least one seated player — the aerial floor shows these only. */
export function populatedVenueTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated > 0)
}

/** Max numbered felts the aerial floor targets on one viewport without scroll. */
export const VENUE_FLOOR_GRID_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

function venueFloorBaseColumns(tableCount: number): number {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 1) return 1
  if (n <= 4) return 2
  if (n <= 9) return 3
  if (n <= 16) return 4
  return 5
}

export type VenueFloorHexLayout = {
  /** How many tables in each honeycomb row (alternating narrow / wide). */
  rowSizes: number[]
  /** Widest row — used for half-cell stagger offset. */
  maxInRow: number
  gapClass: string
}

/**
 * Honeycomb row packing: alternate narrow and wide rows (e.g. 4-5-4-5 for 20 tables).
 * Narrow rows are visually offset by half a cell so felts nest like a tournament room.
 */
export function venueFloorHexLayout(tableCount: number): VenueFloorHexLayout {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 0) {
    return { rowSizes: [], maxInRow: 0, gapClass: 'gap-2' }
  }
  if (n === 1) {
    return { rowSizes: [1], maxInRow: 1, gapClass: 'gap-2' }
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

  // Merge a trailing singleton into the previous row when possible.
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
  const gapClass =
    n > 12 ? 'gap-1 sm:gap-1.5' : n > 6 ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-2.5'

  return { rowSizes, maxInRow, gapClass }
}

/** Split tiles into honeycomb rows (preserves table order). */
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

/** Narrow honeycomb rows shift right by half a cell width. */
export function hexRowShouldOffset(rowIndex: number, rowSize: number, maxInRow: number): boolean {
  return rowIndex % 2 === 0 && rowSize < maxInRow
}

/**
 * @deprecated Rectangular grid — use {@link venueFloorHexLayout} instead.
 */
export function venueFloorGridLayout(tableCount: number): {
  columns: number
  rows: number
  gapClass: string
} {
  const { rowSizes, maxInRow, gapClass } = venueFloorHexLayout(tableCount)
  const columns = maxInRow
  const rows = rowSizes.length
  return { columns, rows, gapClass }
}
