import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { CSSProperties } from 'react'
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

/** Columns for A1 — prefer fewer, wider rows so 5–8 felts fit one TV (4×2 vs 3×3). */
export function venueBanquetColumns(tableCount: number): number {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 1) return 1
  if (n <= 4) return 2
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

/** Single-row floors shrink-wrap table height; multi-row floors divide viewport evenly. */
export function venueFloorRowTrackSpec(rowCount: number): {
  gridTemplateRows: string
  shrinkWrapRowHeight: boolean
} {
  if (rowCount <= 1) {
    return { gridTemplateRows: 'auto', shrinkWrapRowHeight: true }
  }
  return {
    gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
    shrinkWrapRowHeight: false,
  }
}

/** 3D tilt only when there is vertical room; dense floors stay flat to avoid clipping. */
export function venueFloorGridPerspectiveStyle(rowCount: number): Pick<
  CSSProperties,
  'perspective' | 'transform' | 'transformOrigin'
> {
  if (rowCount >= 4) return {}
  return {
    perspective: '1400px',
    transform: 'rotateX(3deg)',
    transformOrigin: 'center 50%',
  }
}

/** Extra bottom inset on multi-row floors so the last row + action captions stay in view. */
export function venueFloorGridPaddingRem(rowCount: number): { top: number; bottom: number } {
  if (rowCount <= 1) return { top: 0.75, bottom: 0.75 }
  if (rowCount === 2) return { top: 0.75, bottom: 0.85 }
  if (rowCount === 3) return { top: 0.65, bottom: 1 }
  return { top: 0.5, bottom: 1.15 }
}

/**
 * Table card density tier — driven primarily by how many checkerboard rows the floor needs.
 * More rows ⇒ smaller uniform felts so the whole venue fits one viewport.
 */
export type VenueFloorTableSize = 'hero' | 'large' | 'medium' | 'compact' | 'micro'

export type VenueFloorSizeSpec = {
  size: VenueFloorTableSize
  /** Tighter chrome: smaller padding, fill honeycomb height. */
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
  showPotSubtitle: boolean
  /** “Name to call: $X” strip under the felt — scales with card width (@container). */
  potSubtitleClass: string
  potSubtitleWrapClass: string
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
        showPotSubtitle: true,
        potSubtitleClass:
          'text-[clamp(1rem,6.2cqw,1.65rem)] font-black leading-tight tracking-tight text-amber-50 sm:text-[clamp(1.1rem,6.8cqw,1.85rem)]',
        potSubtitleWrapClass: 'px-2.5 py-2',
      }
    case 'large':
      return {
        size,
        compactChrome: false,
        showdownBrief: true,
        rowGapRem: 0.85,
        cellGapRem: 0.95,
        cardPaddingClass: 'overflow-visible p-2 sm:p-2',
        innerGapClass: 'gap-1.5 sm:gap-2',
        tableNumClass: 'text-xl sm:text-2xl',
        potClass:
          'text-[clamp(1.05rem,6cqw,2rem)] sm:text-[clamp(1.15rem,6.5cqw,2.1rem)]',
        phaseChipClass: 'px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass:
          'text-[clamp(0.9rem,5.8cqw,1.45rem)] font-black leading-tight tracking-tight text-amber-50 sm:text-[clamp(1rem,6.2cqw,1.6rem)]',
        potSubtitleWrapClass: 'px-2 py-1.5',
      }
    case 'medium':
      return {
        size,
        compactChrome: false,
        showdownBrief: true,
        rowGapRem: 1.12,
        cellGapRem: 1.25,
        cardPaddingClass: 'p-1.5 sm:p-2',
        innerGapClass: 'gap-1 sm:gap-1.5',
        tableNumClass: 'text-[clamp(1.15rem,14cqh,1.85rem)] font-black leading-none',
        potClass: 'text-[clamp(1.05rem,13cqh,1.65rem)] font-mono font-black leading-none',
        phaseChipClass:
          'px-1.5 py-0.5 text-[clamp(0.72rem,10cqh,0.9rem)] font-bold uppercase leading-none',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass:
          'text-[clamp(0.85rem,10cqh,1.25rem)] font-black leading-tight tracking-tight text-amber-50',
        potSubtitleWrapClass: 'px-1.5 py-1',
      }
    case 'compact':
      return {
        size,
        compactChrome: true,
        showdownBrief: true,
        rowGapRem: 0.72,
        cellGapRem: 0.82,
        cardPaddingClass: 'p-1 sm:p-1.5',
        innerGapClass: 'gap-0.5',
        tableNumClass: 'text-[clamp(1.35rem,17cqh,2.1rem)] font-black leading-none',
        potClass: 'text-[clamp(1.2rem,16cqh,1.85rem)] font-mono font-black leading-none',
        phaseChipClass:
          'px-1 py-0.5 text-[clamp(0.85rem,12cqh,1.05rem)] font-bold uppercase leading-none',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass:
          'text-[clamp(0.8rem,9.5cqh,1.15rem)] font-black leading-tight tracking-tight text-amber-50',
        potSubtitleWrapClass: 'px-1 py-0.5',
      }
    case 'micro':
      return {
        size,
        compactChrome: true,
        showdownBrief: true,
        rowGapRem: 0.62,
        cellGapRem: 0.72,
        cardPaddingClass: 'p-0.5 sm:p-1',
        innerGapClass: 'gap-0.5',
        tableNumClass: 'text-[clamp(1.45rem,18cqh,2.25rem)] font-black leading-none',
        potClass: 'text-[clamp(1.3rem,17cqh,2rem)] font-mono font-black leading-none',
        phaseChipClass:
          'px-1 py-0.5 text-[clamp(0.9rem,13cqh,1.1rem)] font-bold uppercase leading-none',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showPotSubtitle: false,
        potSubtitleClass:
          'text-[clamp(0.85rem,10cqh,1.1rem)] font-black leading-none tracking-tight text-amber-50',
        potSubtitleWrapClass: 'px-1 py-0.5',
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

export type VenueFloorDenseTuning = {
  rowGapRem: number
  cellGapRem: number
  paddingTopRem: number
  paddingBottomRem: number
  gridInsetClass: string
  potSubtitleWrapClass: string
}

/** Four-row floors (17–20 tables) — keep gaps modest; type scales via cqh on each card. */
export function venueFloorDenseTuning(
  layout: VenueBanquetLayout,
  opts?: { withHeadline?: boolean }
): VenueFloorDenseTuning | null {
  if (layout.rowCount < 4) return null
  const headline = opts?.withHeadline === true
  return {
    rowGapRem: headline ? 0.38 : 0.48,
    cellGapRem: headline ? 0.48 : 0.58,
    paddingTopRem: headline ? 0.2 : 0.3,
    paddingBottomRem: headline ? 0.3 : 0.5,
    gridInsetClass: 'px-2 sm:px-2.5',
    potSubtitleWrapClass: 'px-0.5 py-0.5',
  }
}

export function applyVenueFloorDenseTuning(
  spec: VenueFloorSizeSpec,
  tuning: VenueFloorDenseTuning | null
): VenueFloorSizeSpec {
  if (!tuning) return spec
  return {
    ...spec,
    rowGapRem: tuning.rowGapRem,
    cellGapRem: tuning.cellGapRem,
    potSubtitleWrapClass: tuning.potSubtitleWrapClass,
  }
}
