import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import { stadiumMosaicScaleForWidth, type StadiumMosaicDensity } from '@qhe/ui'
import type { CSSProperties } from 'react'
import { MOSAIC_20UP_TABLE_NUM_PX } from './showdownStageDenseRubric'
import { venueFloorMosaicTypographyTierForSizingCount } from './venueFloorSpecCounts'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  selectVenueFloorLayout,
  venueFloorDensityForCount,
  type VenueFloorLayoutViewport,
} from './venueFloorLayout'

export type { VenueFloorLayoutPlan, VenueFloorLayoutViewport } from './venueFloorLayout'
export {
  selectVenueFloorLayout,
  venueFloorCardSlotWidthCss,
  venueFloorDensityForCount,
  venueFloorPreferredColumns,
  chunkTilesIntoRowGroups,
  VENUE_FLOOR_CARD_SLOT_SCALE,
} from './venueFloorLayout'

/** Tables with at least one seated player — the aerial floor shows these only. */
export function populatedVenueTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated > 0)
}

export const VENUE_FLOOR_GRID_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

/**
 * ## Public eagle-eye display — spacing & typography
 *
 * **Layout** (row groups, columns, card slot width): {@link selectVenueFloorLayout} in
 * `venueFloorLayout.ts`.
 *
 * **Spacing** (gaps, padding, card chrome): {@link venueFloorSpacingSpec} ←
 * {@link venueFloorSizeSpec} + headline multi-row overrides.
 *
 * **Typography** (font sizes): `venue-floor-typography-{spacious|standard|compact}` on the
 * venue wall root sets `--vfd-*` tokens in `index.css`; mosaic cards consume
 * {@link venueFloorMosaicTypography} utility classes (`.vfd-mosaic-*`).
 *
 * **Visual scale**: `VENUE_WALL_UI_SCALE` (0.88 zoom) on the venue wall frame — token
 * px values are pre-compensated (~css × 0.88 = rendered target).
 */

/**
 * Canonical venue floor: count-aware responsive grid with centered partial rows.
 * Replaces the legacy A1 checkerboard half-stagger for the public wagering wall.
 */
export const VENUE_FLOOR_LAYOUT_A1 = 'responsive-fill-grid' as const

/** @deprecated Legacy label — layout is no longer checkerboard-staggered. */
export const VENUE_FLOOR_LAYOUT_LEGACY_CHECKERBOARD = 'checkerboard-half-stagger' as const

/** Columns — delegates to {@link selectVenueFloorLayout}. */
export function venueBanquetColumns(
  tableCount: number,
  opts?: { viewport?: VenueFloorLayoutViewport; withHeadline?: boolean }
): number {
  return selectVenueFloorLayout({ tableCount, ...opts }).columns
}

export type VenueBanquetLayout = {
  columns: number
  rowCount: number
  rowSizes: number[]
  tableCount: number
  density: VenueFloorTableSize
  staggered: boolean
}

export function venueBanquetLayout(
  tableCount: number,
  opts?: { viewport?: VenueFloorLayoutViewport; withHeadline?: boolean }
): VenueBanquetLayout {
  return selectVenueFloorLayout({ tableCount, ...opts })
}

/** Multi-row floors fill equal-height row slots beneath the headline. */
export function venueFloorRowTrackSpec(
  rowCount: number,
  opts?: { withHeadline?: boolean }
): {
  gridTemplateRows: string
  shrinkWrapRowHeight: boolean
  fillRowHeight: boolean
} {
  if (rowCount <= 1) {
    /** Single-row venue walls (e.g. 3-up) must fill remaining viewport — shrink-wrap collapses showdown tiles. */
    const fillSingleRow = opts?.withHeadline === true
    return {
      gridTemplateRows: fillSingleRow ? 'minmax(0, 1fr)' : 'auto',
      shrinkWrapRowHeight: !fillSingleRow,
      fillRowHeight: fillSingleRow,
    }
  }
  return {
    gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
    shrinkWrapRowHeight: false,
    fillRowHeight: true,
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
export const VENUE_FLOOR_GRID_BOTTOM_SAFE_REM = 0.75

export function venueFloorGridPaddingRem(rowCount: number): { top: number; bottom: number } {
  if (rowCount <= 1) return { top: 0.75, bottom: 0.75 }
  if (rowCount === 2) return { top: 0.75, bottom: 0.85 }
  if (rowCount === 3) return { top: 0.65, bottom: 1 }
  return { top: 0.5, bottom: 1.15 }
}

/**
 * Spacing / chrome density from active table count (hero → micro).
 * Distinct from {@link VenueFloorPublicTypographyTier} which drives `--vfd-*` font tokens.
 */
export type VenueFloorTableSize = 'hero' | 'large' | 'medium' | 'compact' | 'micro'

/** Mosaic card chrome — structural classes only; font sizes come from `--vfd-*` utilities. */
export const VENUE_FLOOR_MOSAIC_CHROME = {
  tableNumBadge:
    'inline-flex min-w-[1.5rem] items-center justify-center rounded-md border-2 border-yellow-400/80 bg-gradient-to-b from-yellow-800/95 to-yellow-950 px-1.5 py-px tabular-nums leading-none text-yellow-100 shadow-[0_0_14px_rgba(251,191,36,0.4)]',
  headerRow: 'items-center overflow-visible py-0 leading-none',
} as const

/**
 * Legacy header helpers. **9+ tables (dense mosaic)** use {@link MOSAIC_TYPOGRAPHY_CLASSES}
 * and `--vfd-*` tokens — not the clamp strings below.
 * `tableNum` / `pot` clamp classes apply only on the non-dense path (hero/large, ≤8 tables).
 */
export const VENUE_FLOOR_MOSAIC_HEADER_TYPE = {
  ...VENUE_FLOOR_MOSAIC_CHROME,
  /** Non-dense mosaic only — dense cards use `.vfd-mosaic-table-num`. */
  tableNum: 'vfd-mosaic-table-num leading-none',
  /** Non-dense mosaic only — dense cards use header pot row, not this class. */
  pot: 'vfd-mosaic-stack leading-none',
  phase: 'px-1.5 py-px font-bold uppercase leading-none text-[max(0.62rem,min(3.8cqw,6.4cqh))]',
  seatInitials: 'vfd-mosaic-seat-initial',
  toCallFooterRow: 'vfd-mosaic-footer-row',
  noMoreBetsWatermark: 'vfd-mosaic-watermark',
} as const

/** Public-display typography bands keyed by active table count (1–8 / 9–15 / 16–20). */
export type VenueFloorPublicTypographyTier = 'spacious' | 'standard' | 'compact'

export function venueFloorPublicTypographyTier(tableCount: number): VenueFloorPublicTypographyTier {
  return venueFloorMosaicTypographyTierForSizingCount(tableCount)
}

export type VenueFloorMosaicTypography = {
  /** Applies `--vfd-*` tokens for this table-count band. */
  rootClass: string
  actingName: string
  feltPot: string
  tableNum: string
  toCallLabel: string
  toCallAmount: string
  titleRowClass: string
  footerRowClass: string
  feltMaxHeightClass: string
  noMoreBetsOffsetClass: string
}

const MOSAIC_ACTING_NAME_BASE =
  'truncate leading-none tracking-tight text-[rgba(245,245,240,0.96)]'
const MOSAIC_FELT_POT_BASE = 'leading-none'
const MOSAIC_TABLE_NUM_BASE = 'leading-none tabular-nums'
const MOSAIC_TO_CALL_LABEL_BASE =
  'leading-none tracking-tight text-amber-100/92'
const MOSAIC_TO_CALL_AMOUNT_BASE =
  'leading-none tabular-nums'

const MOSAIC_TYPOGRAPHY_CLASSES: Omit<VenueFloorMosaicTypography, 'rootClass' | 'noMoreBetsOffsetClass'> =
  {
    actingName: `${MOSAIC_ACTING_NAME_BASE} vfd-mosaic-player-name`,
    feltPot: `${MOSAIC_FELT_POT_BASE} vfd-mosaic-stack`,
    tableNum: `${MOSAIC_TABLE_NUM_BASE} vfd-mosaic-table-num`,
    toCallLabel: `${MOSAIC_TO_CALL_LABEL_BASE} vfd-mosaic-to-call-label`,
    toCallAmount: `${MOSAIC_TO_CALL_AMOUNT_BASE} vfd-mosaic-to-call-amount`,
    titleRowClass: 'vfd-mosaic-title-row',
    footerRowClass: 'vfd-mosaic-footer-row',
    feltMaxHeightClass: 'vfd-mosaic-felt-cap',
  }

const NO_MORE_BETS_OFFSET_BY_TIER: Record<VenueFloorPublicTypographyTier, string> = {
  spacious: 'translate-y-[16%]',
  standard: 'translate-y-[22%]',
  compact: 'translate-y-[28%]',
}

/** Table-count-aware mosaic card typography — recomputed when active table count changes. */
export function venueFloorMosaicTypographyForTier(
  tier: VenueFloorPublicTypographyTier
): VenueFloorMosaicTypography {
  return {
    rootClass: `venue-floor-typography-${tier}`,
    ...MOSAIC_TYPOGRAPHY_CLASSES,
    noMoreBetsOffsetClass: NO_MORE_BETS_OFFSET_BY_TIER[tier],
  }
}

export function venueFloorMosaicTypography(tableCount: number): VenueFloorMosaicTypography {
  return venueFloorMosaicTypographyForTier(venueFloorPublicTypographyTier(tableCount))
}

/** Reference px at {@link STADIUM_MOSAIC_REFERENCE_WIDTH_PX} before per-tile scale. */
const MOSAIC_TYPO_BASE_PX: Record<
  VenueFloorPublicTypographyTier,
  {
    playerName: number
    stack: number
    toCallLabel: number
    toCallAmount: number
    tableNum: number
    watermark: number
    titleRowMin: number
    footerRowMin: number
  }
> = {
  spacious: {
    playerName: 30,
    stack: 45,
    toCallLabel: 24,
    toCallAmount: 30,
    tableNum: 30,
    watermark: 27,
    titleRowMin: 34,
    footerRowMin: 34,
  },
  standard: {
    playerName: 32,
    stack: 41,
    toCallLabel: 24,
    toCallAmount: 31,
    tableNum: 28,
    watermark: 24,
    titleRowMin: 36,
    footerRowMin: 38,
  },
  compact: {
    playerName: 25,
    stack: 39,
    toCallLabel: 20,
    toCallAmount: 25,
    tableNum: MOSAIC_20UP_TABLE_NUM_PX,
    watermark: 22,
    titleRowMin: 30,
    footerRowMin: 31,
  },
}

/** Measured-tile typography — scales with felt width (reliable under venue-wall zoom). */
export function venueMosaicTileTypographyStyle(
  tier: VenueFloorPublicTypographyTier,
  tileWidthPx: number,
  density: VenueFloorTableSize
): CSSProperties {
  if (tileWidthPx <= 0) return {}
  const scale = stadiumMosaicScaleForWidth(tileWidthPx, density as StadiumMosaicDensity)
  const base = MOSAIC_TYPO_BASE_PX[tier]
  const px = (n: number, floor = 10) => `${Math.max(floor, Math.round(n * scale))}px`
  return {
    '--vfd-player-name-size': px(base.playerName),
    '--vfd-stack-size': px(base.stack, 12),
    '--vfd-to-call-label-size': px(base.toCallLabel),
    '--vfd-to-call-amount-size': px(base.toCallAmount, 12),
    '--vfd-table-number-size': px(base.tableNum),
    '--vfd-watermark-size': px(base.watermark),
    '--vfd-title-row-min-h': px(base.titleRowMin, 18),
    '--vfd-footer-row-min-h': px(base.footerRowMin, 18),
  } as CSSProperties
}

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
  /** Optional mosaic felt override — unused on fill-height multi-row floors. */
  feltAspectClass?: string
  feltWidthClass?: string
}

/** Headline + multi-row floors tighten gaps and padding in one place. */
function headlineMultiRowSpacingOverrides(
  layout: Pick<VenueBanquetLayout, 'rowCount'>,
  withHeadline: boolean
): Partial<VenueFloorSizeSpec> & {
  paddingTopRem?: number
  paddingBottomRem?: number
  gridInsetClass?: string
} | null {
  if (!withHeadline || layout.rowCount < 2) return null
  return {
    rowGapRem: 0.65,
    cellGapRem: 0.82,
    paddingTopRem: 0,
    paddingBottomRem: VENUE_FLOOR_GRID_BOTTOM_SAFE_REM,
    gridInsetClass: 'px-1.5 sm:px-2',
    potSubtitleWrapClass: 'px-0.5 py-0.5',
    tableNumClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.tableNum,
    potClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.pot,
    phaseChipClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.phase,
    headerRowClass: VENUE_FLOOR_MOSAIC_CHROME.headerRow,
    potSubtitleClass:
      'text-[clamp(12px,1.5vmin,16px)] font-black leading-none tracking-tight text-amber-50',
    ringScaleClass: '',
    tileInsetClass: '',
    cardPaddingClass: 'px-1 pt-0 pb-0',
  }
}

/**
 * Spacing spec for the aerial floor — merges spec felt density with headline multi-row tuning.
 */
export function venueFloorSpacingSpecForSpec(
  spec: { feltDensity: VenueFloorTableSize },
  layout: Pick<VenueBanquetLayout, 'rowCount'>,
  opts?: { withHeadline?: boolean }
): VenueFloorSizeSpec {
  const base = venueFloorSizeSpecForDensity(spec.feltDensity)
  const overrides = headlineMultiRowSpacingOverrides(layout, opts?.withHeadline === true)
  if (overrides == null) return base
  const { paddingTopRem: _pt, paddingBottomRem: _pb, gridInsetClass: _gi, ...specOverrides } =
    overrides
  return { ...base, ...specOverrides }
}

/** @deprecated Use {@link venueFloorSpacingSpecForSpec} with a resolved {@link VenueFloorSpec}. */
export function venueFloorSpacingSpec(
  tableCount: number,
  layout: Pick<VenueBanquetLayout, 'rowCount'>,
  opts?: { withHeadline?: boolean }
): VenueFloorSizeSpec {
  return venueFloorSpacingSpecForSpec(
    { feltDensity: venueFloorTableSize(tableCount) },
    layout,
    opts
  )
}

/** Grid padding for the floor host — uses headline overrides when present. */
export function venueFloorGridPaddingForLayout(
  rowCount: number,
  opts?: { withHeadline?: boolean }
): { top: number; bottom: number } {
  const overrides = headlineMultiRowSpacingOverrides({ rowCount }, opts?.withHeadline === true)
  if (overrides?.paddingTopRem != null && overrides.paddingBottomRem != null) {
    return { top: overrides.paddingTopRem, bottom: overrides.paddingBottomRem }
  }
  return venueFloorGridPaddingRem(rowCount)
}

/** Grid horizontal inset when headline multi-row tuning is active. */
export function venueFloorGridInsetClass(
  rowCount: number,
  opts?: { withHeadline?: boolean }
): string | null {
  return headlineMultiRowSpacingOverrides({ rowCount }, opts?.withHeadline === true)?.gridInsetClass ?? null
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
}

/** @deprecated Use {@link venueFloorSpacingSpec}. */
export function venueFloorDenseTuning(
  layout: VenueBanquetLayout,
  opts?: { withHeadline?: boolean }
): VenueFloorDenseTuning | null {
  const overrides = headlineMultiRowSpacingOverrides(layout, opts?.withHeadline === true)
  if (overrides == null) return null
  return {
    rowGapRem: overrides.rowGapRem!,
    cellGapRem: overrides.cellGapRem!,
    paddingTopRem: overrides.paddingTopRem!,
    paddingBottomRem: overrides.paddingBottomRem!,
    gridInsetClass: overrides.gridInsetClass!,
    potSubtitleWrapClass: overrides.potSubtitleWrapClass!,
    tableNumClass: overrides.tableNumClass!,
    potClass: overrides.potClass!,
    phaseChipClass: overrides.phaseChipClass!,
    headerRowClass: overrides.headerRowClass!,
    potSubtitleClass: overrides.potSubtitleClass!,
    ringScaleClass: overrides.ringScaleClass!,
    tileInsetClass: overrides.tileInsetClass!,
    cardPaddingClass: overrides.cardPaddingClass,
  }
}

/** @deprecated Use {@link venueFloorSpacingSpec}. */
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
  }
}
export function venueFloorTableSize(tableCount: number): VenueFloorTableSize {
  return venueFloorDensityForCount(tableCount)
}

export function venueFloorSizeSpec(tableCount: number): VenueFloorSizeSpec {
  return venueFloorSizeSpecForDensity(venueFloorTableSize(tableCount))
}

export function venueFloorSizeSpecForDensity(size: VenueFloorTableSize): VenueFloorSizeSpec {
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
        tableNumClass: 'leading-none text-yellow-400',
        potClass: '',
        phaseChipClass: 'px-2 py-1 text-[max(0.62rem,min(3.8cqw,6.4cqh))] sm:px-2.5 sm:py-1.5',
        headerRowClass: 'items-center',
        honeycombFillHeight: false,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass:
          'font-black leading-tight tracking-tight text-amber-50 vfd-mosaic-stack',
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
        cardPaddingClass: 'px-1.5 pt-1 pb-0.5 sm:px-2 sm:pt-1.5 sm:pb-1',
        innerGapClass: 'gap-0',
        tableNumClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.tableNum,
        potClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.pot,
        phaseChipClass: VENUE_FLOOR_MOSAIC_HEADER_TYPE.phase,
        headerRowClass: VENUE_FLOOR_MOSAIC_CHROME.headerRow,
        honeycombFillHeight: true,
        ringScaleClass: '',
        showPotSubtitle: true,
        potSubtitleClass: 'text-[clamp(12px,1.5vmin,16px)] font-black leading-tight tracking-tight text-amber-50',
        potSubtitleWrapClass: 'px-1.5 py-1',
        tileInsetClass: VENUE_FLOOR_MOSAIC_TILE_INSET,
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
        headerRowClass: VENUE_FLOOR_MOSAIC_CHROME.headerRow,
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
        headerRowClass: VENUE_FLOOR_MOSAIC_CHROME.headerRow,
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
        headerRowClass: VENUE_FLOOR_MOSAIC_CHROME.headerRow,
        honeycombFillHeight: false,
        ringScaleClass: '',
        showPotSubtitle: false,
        potSubtitleClass: 'text-[clamp(12px,1.5vmin,16px)] font-black leading-none tracking-tight text-amber-50',
        potSubtitleWrapClass: 'px-1 py-0.5',
        tileInsetClass: VENUE_FLOOR_MOSAIC_TILE_INSET,
      }
  }
}
