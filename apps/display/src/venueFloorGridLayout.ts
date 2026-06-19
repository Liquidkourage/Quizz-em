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

/** Single-row floors shrink-wrap; four-row + headline fills equal row slots. */
export function venueFloorRowTrackSpec(
  rowCount: number,
  opts?: { fillHeight?: boolean }
): {
  gridTemplateRows: string
  shrinkWrapRowHeight: boolean
  fillRowHeight: boolean
} {
  if (rowCount <= 1) {
    return { gridTemplateRows: 'auto', shrinkWrapRowHeight: true, fillRowHeight: false }
  }
  if (rowCount >= 4) {
    if (opts?.fillHeight) {
      return {
        gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
        shrinkWrapRowHeight: false,
        fillRowHeight: true,
      }
    }
    return {
      gridTemplateRows: `repeat(${rowCount}, auto)`,
      shrinkWrapRowHeight: true,
      fillRowHeight: false,
    }
  }
  return {
    gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
    shrinkWrapRowHeight: false,
    fillRowHeight: false,
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

/** TV-readable mosaic header type — vmin compensates for venue-wall 0.88 zoom. */
export const VENUE_FLOOR_MOSAIC_HEADER_TYPE = {
  tableNum: 'text-[clamp(18px,2.55vmin,26px)] font-black leading-none',
  tableNumBadge:
    'inline-flex min-w-[1.5rem] items-center justify-center rounded-md border-2 border-yellow-400/80 bg-gradient-to-b from-yellow-800/95 to-yellow-950 px-1.5 py-px font-black tabular-nums leading-none text-yellow-100 shadow-[0_0_14px_rgba(251,191,36,0.4)]',
  pot: 'text-[clamp(16px,2.15vmin,22px)] font-mono font-black leading-none',
  /** Pot centered on mosaic felt — scales with tile width, not header chrome. */
  feltPot: 'text-[clamp(24px,3.35vmin,38px)] font-mono font-black leading-none',
  actingName:
    'truncate text-[clamp(18px,2.9vmin,28px)] font-black leading-none tracking-tight text-cyan-50 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]',
  phase: 'px-1.5 py-px text-[clamp(13px,1.85vmin,17px)] font-bold uppercase leading-none',
  headerRow: 'items-center overflow-visible py-0 leading-none',
  seatInitials: 'text-[clamp(12px,1.65vmin,17px)]',
  /** Matches {@link actingName} size — under-felt call caption during wagering. */
  toCallStrip:
    'pt-0 text-[clamp(18px,2.9vmin,28px)] font-black leading-none tracking-tight text-amber-100/90',
  noMoreBetsWatermark:
    'pointer-events-none select-none whitespace-nowrap text-center text-[clamp(15px,2.35vmin,24px)] font-black uppercase leading-none tracking-[0.14em] text-emerald-300/35',
} as const

/** Slightly taller mosaic felt — room for under-table call caption without shrinking type. */
export const VENUE_FLOOR_MOSAIC_TILE_INSET = 'mx-auto w-[90%] max-w-full'
export const VENUE_FLOOR_MOSAIC_FELT_ASPECT = '17/10' as const
/** Narrower felt within the tile — frees vertical chrome for name + to-call type. */
export const VENUE_FLOOR_MOSAIC_FELT_WIDTH_CLASS = 'mx-auto w-[93%] max-w-full'

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
  /** Fixed-height mosaic card chrome row — keeps pot/phase from blowing up tile layout. */
  headerRowClass: string
  honeycombFillHeight: boolean
  /** Legacy non-honeycomb shrink — unused on checkerboard floor. */
  ringScaleClass: string
  showPotSubtitle: boolean
  /** “Name to call: $X” strip under the felt — scales with card width (@container). */
  potSubtitleClass: string
  potSubtitleWrapClass: string
  /** Narrower tile width on dense checkerboard floors — prevents stagger overlap. */
  tileInsetClass: string
  /** Optional mosaic felt override — shorter/narrower when headline steals vertical room. */
  feltAspectClass?: string
  feltWidthClass?: string
  /** Viewport row budget — caps width-driven felts on wide TVs (four-row + headline). */
  feltMaxHeightCss?: string
}

/** Felt height cap for four-row floors with a headline strip. */
export function venueFloorHeadlineFeltMaxHeightCss(rowCount: number): string {
  const rows = Math.max(4, Math.floor(rowCount))
  return `calc((100dvh - 10rem) / ${rows} * 0.56)`
}

/** Max uniform zoom for four-row floors — also the shrink target when content fits. */
export const VENUE_FLOOR_FOUR_ROW_TILE_SCALE = 0.9

export function venueFloorTileScale(rowCount: number): number {
  return rowCount >= 4 ? VENUE_FLOOR_FOUR_ROW_TILE_SCALE : 1
}

/** Pick the smaller of the four-row shrink cap and the zoom needed to fit the host. */
export function venueFloorFourRowFitZoom(availPx: number, needPx: number): number {
  const cap = VENUE_FLOOR_FOUR_ROW_TILE_SCALE
  if (!(availPx > 0) || !(needPx > 0)) return cap
  return Math.min(cap, availPx / needPx)
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
        rowGapRem: 1.35,
        cellGapRem: 1.75,
        cardPaddingClass: 'overflow-visible p-2 sm:p-2.5',
        innerGapClass: 'gap-1.5 sm:gap-2',
        tableNumClass: 'text-2xl sm:text-3xl',
        potClass:
          'text-[clamp(1.15rem,6.5cqw,2.25rem)] sm:text-[clamp(1.25rem,7cqw,2.4rem)]',
        phaseChipClass: 'px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs',
        headerRowClass: 'items-center',
        honeycombFillHeight: false,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass:
          'text-[clamp(1rem,6.2cqw,1.65rem)] font-black leading-tight tracking-tight text-amber-50 sm:text-[clamp(1.1rem,6.8cqw,1.85rem)]',
        potSubtitleWrapClass: 'px-2.5 py-2',
        tileInsetClass: '',
      }
    case 'large':
      return {
        size,
        compactChrome: false,
        showdownBrief: true,
        rowGapRem: 0.77,
        cellGapRem: 0.95,
        cardPaddingClass: 'overflow-visible p-2 sm:p-2',
        innerGapClass: 'gap-1.5 sm:gap-2',
        tableNumClass: 'text-xl sm:text-2xl',
        potClass:
          'text-[clamp(1.05rem,6cqw,2rem)] sm:text-[clamp(1.15rem,6.5cqw,2.1rem)]',
        phaseChipClass: 'px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs',
        headerRowClass: 'items-center',
        honeycombFillHeight: true,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass:
          'text-[clamp(0.9rem,5.8cqw,1.45rem)] font-black leading-tight tracking-tight text-amber-50 sm:text-[clamp(1rem,6.2cqw,1.6rem)]',
        potSubtitleWrapClass: 'px-2 py-1.5',
        tileInsetClass: '',
      }
    case 'medium':
      return {
        size,
        compactChrome: false,
        showdownBrief: true,
        rowGapRem: 0.77,
        cellGapRem: 0.95,
        cardPaddingClass: 'px-1.5 pt-1 pb-0.5 sm:px-2 sm:pt-1.5 sm:pb-1',
        innerGapClass: 'gap-0',
        tableNumClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.tableNum,
        potClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.pot,
        phaseChipClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.phase,
        headerRowClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.headerRow,
        honeycombFillHeight: false,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass: 'text-[clamp(12px,1.5vmin,16px)] font-black leading-tight tracking-tight text-amber-50',
        potSubtitleWrapClass: 'px-1.5 py-1',
        tileInsetClass: VENUE_FLOOR_MOSAIC_TILE_INSET,
      }
    case 'compact':
      return {
        size,
        compactChrome: true,
        showdownBrief: true,
        rowGapRem: 0.65,
        cellGapRem: 0.82,
        cardPaddingClass: 'px-1 pt-1 pb-0.5 sm:px-1.5 sm:pt-1 sm:pb-1',
        innerGapClass: 'gap-0',
        tableNumClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.tableNum,
        potClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.pot,
        phaseChipClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.phase,
        headerRowClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.headerRow,
        honeycombFillHeight: false,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass: 'text-[clamp(12px,1.5vmin,16px)] font-black leading-tight tracking-tight text-amber-50',
        potSubtitleWrapClass: 'px-1 py-0.5',
        tileInsetClass: VENUE_FLOOR_MOSAIC_TILE_INSET,
      }
    case 'micro':
      return {
        size,
        compactChrome: true,
        showdownBrief: true,
        rowGapRem: 0.61,
        cellGapRem: 0.78,
        cardPaddingClass: 'px-1 pt-1 pb-0.5 sm:px-1.5 sm:pt-1 sm:pb-1',
        innerGapClass: 'gap-0',
        tableNumClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.tableNum,
        potClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.pot,
        phaseChipClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.phase,
        headerRowClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.headerRow,
        honeycombFillHeight: false,
        ringScaleClass: '',
        showPotSubtitle: false,
        potSubtitleClass: 'text-[clamp(12px,1.5vmin,16px)] font-black leading-none tracking-tight text-amber-50',
        potSubtitleWrapClass: 'px-1 py-0.5',
        tileInsetClass: VENUE_FLOOR_MOSAIC_TILE_INSET,
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
  tableNumClass: string
  potClass: string
  phaseChipClass: string
  headerRowClass: string
  potSubtitleClass: string
  ringScaleClass: string
  tileInsetClass: string
  cardPaddingClass?: string
  feltAspectClass?: string
  feltWidthClass?: string
  feltMaxHeightCss?: string
}

/** Four-row floors — tighten gaps and felt so the bottom row stays in view with a headline. */
export function venueFloorDenseTuning(
  layout: VenueBanquetLayout,
  opts?: { withHeadline?: boolean }
): VenueFloorDenseTuning | null {
  if (layout.rowCount < 4) return null
  const headline = opts?.withHeadline === true
  return {
    rowGapRem: headline ? 0.2 : 0.55,
    cellGapRem: headline ? 0.28 : 0.58,
    paddingTopRem: 0,
    paddingBottomRem: 0,
    gridInsetClass: headline ? 'px-1 sm:px-1.5' : 'px-2 sm:px-3',
    potSubtitleWrapClass: 'px-0.5 py-0.5',
    tableNumClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.tableNum,
    potClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.pot,
    phaseChipClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.phase,
    headerRowClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.headerRow,
    potSubtitleClass: 'text-[clamp(12px,1.5vmin,16px)] font-black leading-none tracking-tight text-amber-50',
    ringScaleClass: '',
    tileInsetClass: VENUE_FLOOR_MOSAIC_TILE_INSET,
    ...(headline
      ? {
          cardPaddingClass: 'px-1 pt-0 pb-0',
          feltMaxHeightCss: venueFloorHeadlineFeltMaxHeightCss(layout.rowCount),
        }
      : {}),
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
    tableNumClass: tuning.tableNumClass,
    potClass: tuning.potClass,
    phaseChipClass: tuning.phaseChipClass,
    headerRowClass: tuning.headerRowClass,
    potSubtitleClass: tuning.potSubtitleClass,
    ringScaleClass: tuning.ringScaleClass,
    tileInsetClass: tuning.tileInsetClass,
    ...(tuning.cardPaddingClass != null ? { cardPaddingClass: tuning.cardPaddingClass } : {}),
    ...(tuning.feltAspectClass != null ? { feltAspectClass: tuning.feltAspectClass } : {}),
    ...(tuning.feltWidthClass != null ? { feltWidthClass: tuning.feltWidthClass } : {}),
    ...(tuning.feltMaxHeightCss != null ? { feltMaxHeightCss: tuning.feltMaxHeightCss } : {}),
  }
}
