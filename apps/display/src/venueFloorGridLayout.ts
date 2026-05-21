import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

/** Tables with at least one seated player — the aerial floor shows these only. */
export function populatedVenueTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated > 0)
}

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
  rowSizes: number[]
  maxInRow: number
  /** Gap between honeycomb rows. */
  rowGapClass: string
  /** Gap between felts within a row. */
  cellGapClass: string
}

/**
 * Honeycomb packing: alternate narrow / wide rows (e.g. 4-5-4-5 for 20 tables).
 * Narrow rows offset by half a cell so felts nest between the row above/below.
 */
export function venueFloorHexLayout(tableCount: number): VenueFloorHexLayout {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 0) {
    return { rowSizes: [], maxInRow: 0, rowGapClass: 'gap-y-4', cellGapClass: 'gap-3' }
  }
  if (n === 1) {
    return { rowSizes: [1], maxInRow: 1, rowGapClass: 'gap-y-4', cellGapClass: 'gap-4 sm:gap-5' }
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

  /** Generous spacing — room to breathe even at 20 tables. */
  const cellGapClass =
    maxInRow > 10
      ? 'gap-2.5 sm:gap-3.5 md:gap-4'
      : maxInRow > 6
        ? 'gap-3 sm:gap-4 md:gap-5'
        : 'gap-4 sm:gap-5 md:gap-6'

  const rowGapClass = 'gap-y-3 sm:gap-y-4 md:gap-y-5'

  return { rowSizes, maxInRow, rowGapClass, cellGapClass }
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

/** Narrow honeycomb rows shift right by half a cell width. */
export function hexRowShouldOffset(rowIndex: number, rowSize: number, maxInRow: number): boolean {
  return rowIndex % 2 === 0 && rowSize < maxInRow
}

export function venueFloorShowdownBrief(maxInRow: number): boolean {
  return maxInRow > 6
}

export function venueFloorCompact(maxInRow: number): boolean {
  return maxInRow > 8
}
