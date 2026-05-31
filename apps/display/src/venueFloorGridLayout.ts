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

/** @deprecated Prefer {@link venueFloorSizeSpec} row/cell gaps. */
export const VENUE_FLOOR_ROW_GAP_REM = 1.25

/** @deprecated Prefer {@link venueFloorSizeSpec} row/cell gaps. */
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

/**
 * Table card density tier — driven primarily by how many checkerboard rows the floor needs.
 * More rows ⇒ smaller uniform felts so the whole venue fits one viewport.
 */
export type VenueFloorTableSize = 'hero' | 'large' | 'medium' | 'compact' | 'micro'

export type VenueFloorSizeSpec = {
  size: VenueFloorTableSize
  /** Tighter chrome: hide seat list, smaller padding, fill honeycomb height. */
  compactChrome: boolean
  /** Showdown winner overlay only (no full results panel). */
  showdownBrief: boolean
  rowGapRem: number
  cellGapRem: number
  cardPaddingClass: string
  innerGapClass: string
  tableNumClass: string
  potClass: string
  phaseChipClass: string
  honeycombFillHeight: boolean
  /** Legacy non-honeycomb shrink — unused on checkerboard floor. */
  ringScaleClass: string
  showSeatList: boolean
  showPotSubtitle: boolean
}

/** Pick felt size tier from banquet row count (and column width at the tightest band). */
export function venueFloorTableSize(layout: VenueBanquetLayout): VenueFloorTableSize {
  const { columns, rowCount } = layout
  if (rowCount <= 1) return 'hero'
  if (rowCount === 2) return 'large'
  if (rowCount === 3) return 'medium'
  if (rowCount === 4 && columns <= 4) return 'compact'
  return 'micro'
}

export function venueFloorSizeSpec(layout: VenueBanquetLayout): VenueFloorSizeSpec {
  const size = venueFloorTableSize(layout)
  switch (size) {
    case 'hero':
      return {
        size,
        compactChrome: false,
        showdownBrief: false,
        rowGapRem: 1.5,
        cellGapRem: 1.75,
        cardPaddingClass: 'overflow-visible p-2 sm:p-2.5',
        innerGapClass: 'gap-1.5 sm:gap-2',
        tableNumClass: 'text-2xl sm:text-3xl',
        potClass:
          'text-[clamp(1.15rem,6.5cqw,2.25rem)] sm:text-[clamp(1.25rem,7cqw,2.4rem)]',
        phaseChipClass: 'px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs',
        honeycombFillHeight: false,
        ringScaleClass: '',
        showSeatList: true,
        showPotSubtitle: true,
      }
    case 'large':
      return {
        size,
        compactChrome: false,
        showdownBrief: true,
        rowGapRem: 1.35,
        cellGapRem: 1.55,
        cardPaddingClass: 'overflow-visible p-2 sm:p-2',
        innerGapClass: 'gap-1.5 sm:gap-2',
        tableNumClass: 'text-xl sm:text-2xl',
        potClass:
          'text-[clamp(1.05rem,6cqw,2rem)] sm:text-[clamp(1.15rem,6.5cqw,2.1rem)]',
        phaseChipClass: 'px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showSeatList: true,
        showPotSubtitle: true,
      }
    case 'medium':
      return {
        size,
        compactChrome: false,
        showdownBrief: true,
        rowGapRem: 1.2,
        cellGapRem: 1.35,
        cardPaddingClass: 'p-1.5 sm:p-2',
        innerGapClass: 'gap-1 sm:gap-1.5',
        tableNumClass: 'text-lg sm:text-xl',
        potClass:
          'text-[clamp(0.95rem,5.5cqw,1.75rem)] sm:text-[clamp(1.05rem,6cqw,1.9rem)]',
        phaseChipClass: 'px-1.5 py-0.5 text-[9px] sm:px-2 sm:py-1 sm:text-[10px]',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showSeatList: false,
        showPotSubtitle: false,
      }
    case 'compact':
      return {
        size,
        compactChrome: true,
        showdownBrief: true,
        rowGapRem: 1.05,
        cellGapRem: 1.15,
        cardPaddingClass: 'p-1 sm:p-1.5',
        innerGapClass: 'gap-0.5',
        tableNumClass: 'text-base sm:text-lg',
        potClass:
          'text-[clamp(0.9rem,5cqw,1.45rem)] sm:text-[clamp(0.95rem,5.5cqw,1.55rem)]',
        phaseChipClass: 'px-1.5 py-0.5 text-[9px] sm:px-2 sm:py-1 sm:text-[10px]',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showSeatList: false,
        showPotSubtitle: false,
      }
    case 'micro':
      return {
        size,
        compactChrome: true,
        showdownBrief: true,
        rowGapRem: 0.85,
        cellGapRem: 0.95,
        cardPaddingClass: 'p-0.5 sm:p-1',
        innerGapClass: 'gap-0.5',
        tableNumClass: 'text-sm sm:text-base',
        potClass:
          'text-[clamp(0.8rem,4.5cqw,1.2rem)] sm:text-[clamp(0.85rem,5cqw,1.35rem)]',
        phaseChipClass: 'px-1 py-px text-[8px] sm:px-1.5 sm:py-0.5 sm:text-[9px]',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showSeatList: false,
        showPotSubtitle: false,
      }
  }
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

/** @deprecated Use {@link venueFloorSizeSpec}. */
export function venueFloorShowdownBrief(columns: number): boolean {
  return columns > 4
}

/** @deprecated Use {@link venueFloorSizeSpec}. */
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
