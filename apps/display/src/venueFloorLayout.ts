import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { VenueFloorTableSize } from './venueFloorGridLayout'

/** Max tables on the venue floor grid. */
const VENUE_FLOOR_GRID_MAX_TABLES = VENUE_NUMBERED_TABLE_MAX

/** Approximate felt width:height (17/10 stadium capsule). */
const FELT_ASPECT = 17 / 10
/** Header + optional to-call strip (px). */
const CARD_CHROME_PX = 58
const MIN_FELT_WIDTH_PX = 118
const MIN_FELT_HEIGHT_PX = 68
const MAX_COLUMNS = 5
const GRID_INSET_PX = 28
const HEADLINE_RESERVE_PX = 168

export type VenueFloorLayoutViewport = {
  widthPx: number
  heightPx: number
}

export type VenueFloorLayoutPlan = {
  columns: number
  rowCount: number
  tableCount: number
  density: VenueFloorTableSize
}

export function venueFloorDensityForCount(tableCount: number): VenueFloorTableSize {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 2) return 'hero'
  if (n <= 4) return 'large'
  if (n <= 8) return 'large'
  if (n <= 12) return 'medium'
  if (n <= 15) return 'compact'
  return 'micro'
}

/** Count-only column preference when viewport is unknown (SSR/tests). */
export function venueFloorPreferredColumns(tableCount: number): number {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 1) return 1
  if (n <= 4) return 2
  if (n <= 6) return 3
  if (n <= 8) return 4
  if (n <= 15) return 5
  return 5
}

function candidateColumnCounts(tableCount: number): number[] {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 0) return [1]
  if (n === 1) return [1]
  if (n <= 4) return [...new Set([n, 2])].sort((a, b) => a - b)
  const max = Math.min(MAX_COLUMNS, n)
  return Array.from({ length: max - 1 }, (_, i) => i + 2)
}

function countOnlyLayoutScore(tableCount: number, columns: number, rowCount: number): number {
  const preferred = venueFloorPreferredColumns(tableCount)
  let score = 10_000
  score -= rowCount * 620
  score -= Math.abs(columns - preferred) * 240
  if (tableCount > 8 && columns >= 5) score += 180
  if (tableCount <= 6 && columns === 3 && rowCount === 2) score += 220
  return score
}

function viewportLayoutScore(
  tableCount: number,
  columns: number,
  rowCount: number,
  viewport: VenueFloorLayoutViewport,
  withHeadline: boolean
): number {
  const gapPx = 10
  const availW = Math.max(0, viewport.widthPx - GRID_INSET_PX)
  const availH = Math.max(
    0,
    viewport.heightPx - GRID_INSET_PX - (withHeadline ? HEADLINE_RESERVE_PX : 0)
  )
  if (availW <= 0 || availH <= 0) {
    return countOnlyLayoutScore(tableCount, columns, rowCount)
  }

  const cellW = (availW - (columns - 1) * gapPx) / columns
  const cellH = (availH - (rowCount - 1) * gapPx) / rowCount
  const feltH = Math.min(cellH - CARD_CHROME_PX, (cellW * 0.94) / FELT_ASPECT)
  const feltW = feltH * FELT_ASPECT

  if (feltW < MIN_FELT_WIDTH_PX || feltH < MIN_FELT_HEIGHT_PX) return Number.NEGATIVE_INFINITY

  let score = feltW * feltH
  score -= rowCount * 420
  score -= Math.abs(columns - venueFloorPreferredColumns(tableCount)) * 120
  return score
}

/**
 * Choose columns/rows/density for the venue wagering floor.
 * Considers table count and (optionally) measured viewport beneath the headline.
 */
export function selectVenueFloorLayout(opts: {
  tableCount: number
  viewport?: VenueFloorLayoutViewport
  withHeadline?: boolean
}): VenueFloorLayoutPlan {
  const tableCount = Math.max(
    0,
    Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(opts.tableCount))
  )
  if (tableCount <= 0) {
    return { columns: 1, rowCount: 0, tableCount: 0, density: 'hero' }
  }

  let bestColumns = 1
  let bestScore = Number.NEGATIVE_INFINITY

  for (const columns of candidateColumnCounts(tableCount)) {
    const rowCount = Math.ceil(tableCount / columns)
    const score =
      opts.viewport != null
        ? viewportLayoutScore(tableCount, columns, rowCount, opts.viewport, opts.withHeadline === true)
        : countOnlyLayoutScore(tableCount, columns, rowCount)
    if (score > bestScore) {
      bestScore = score
      bestColumns = columns
    }
  }

  return {
    columns: bestColumns,
    rowCount: Math.ceil(tableCount / bestColumns),
    tableCount,
    density: venueFloorDensityForCount(tableCount),
  }
}

/** Slot width for a card in a centered row — partial rows use the same width as full rows. */
export function venueFloorCardSlotWidthCss(columns: number, cellGapRem: number): string {
  const cols = Math.max(1, columns)
  const gaps = cols > 1 ? `(${cols} - 1) * ${cellGapRem}rem` : '0rem'
  return `calc((100% - ${gaps}) / ${cols})`
}
