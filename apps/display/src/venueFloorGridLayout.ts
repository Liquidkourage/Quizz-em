import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

/** Tables with at least one seated player — the aerial floor shows these only. */
export function populatedVenueTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated > 0)
}

/** Max numbered felts the aerial floor targets on one viewport without scroll. */
export const VENUE_FLOOR_GRID_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

export type VenueFloorLayout = {
  /** Always one or two rows: top half / bottom half of the floor. */
  rowSizes: number[]
  maxInRow: number
  /** Vertical space between the two tall rows. */
  rowGapClass: string
  /** Horizontal space between felts within a row. */
  cellGapClass: string
}

/**
 * Two tall rows (top / bottom), tables spaced apart with the bottom row
 * staggered horizontally. Per-tile nudges add slight in-row repositioning.
 */
export function venueFloorLayout(tableCount: number): VenueFloorLayout {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 0) {
    return { rowSizes: [], maxInRow: 0, rowGapClass: 'gap-y-6', cellGapClass: 'gap-4' }
  }
  if (n === 1) {
    return {
      rowSizes: [1],
      maxInRow: 1,
      rowGapClass: 'gap-y-6',
      cellGapClass: 'gap-4 sm:gap-5',
    }
  }

  const top = Math.ceil(n / 2)
  const bottom = n - top
  const rowSizes = bottom > 0 ? [top, bottom] : [top]
  const maxInRow = Math.max(...rowSizes, 1)

  const cellGapClass =
    maxInRow > 10
      ? 'gap-2.5 sm:gap-3 md:gap-4'
      : maxInRow > 6
        ? 'gap-3 sm:gap-4 md:gap-5'
        : 'gap-4 sm:gap-5 md:gap-6'

  const rowGapClass = 'gap-y-6 sm:gap-y-9 md:gap-y-12'

  return { rowSizes, maxInRow, rowGapClass, cellGapClass }
}

/** @deprecated Use {@link venueFloorLayout}. */
export const venueFloorHexLayout = venueFloorLayout

/** Split tiles into floor rows (preserves table order). */
export function chunkTilesForFloorRows<T extends { tableNum: number }>(
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

/** @deprecated Use {@link chunkTilesForFloorRows}. */
export const chunkTilesForHexRows = chunkTilesForFloorRows

/** Bottom row shifts right so felts nest between the row above. */
export function floorRowStaggerTransform(rowIndex: number, rowCount: number): string | undefined {
  if (rowCount < 2 || rowIndex !== 1) return undefined
  return 'translateX(var(--venue-floor-stagger))'
}

/** Subtle zigzag within a row so the line does not read as a rigid strip. */
export function floorTileNudgeStyle(
  rowIndex: number,
  colIndex: number
): { transform: string } {
  const rowLift = rowIndex === 0 ? -3 : 4
  const colWave = ((colIndex % 3) - 1) * 5
  const zigzag = colIndex % 2 === rowIndex % 2 ? -4 : 4
  return {
    transform: `translate(${colWave}px, ${rowLift + zigzag}px)`,
  }
}

/**
 * @deprecated Rectangular grid — use {@link venueFloorLayout}.
 */
export function venueFloorGridLayout(tableCount: number): {
  columns: number
  rows: number
  gapClass: string
} {
  const { rowSizes, maxInRow, cellGapClass } = venueFloorLayout(tableCount)
  return { columns: maxInRow, rows: rowSizes.length, gapClass: cellGapClass }
}
