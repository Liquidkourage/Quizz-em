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

/**
 * Venue floor layout — single source of truth for row grouping and card slot width.
 *
 * {@link selectVenueFloorLayout} chooses row patterns (e.g. 5–4–5 for 14 tables) from
 * {@link VENUE_FLOOR_STAGGER_PATTERNS} plus uniform grid fallbacks, scored by table count
 * and optional viewport measurement. Spacing and typography live in venueFloorGridLayout.ts.
 */

/** Count-aware stagger row groupings — each pattern must sum to the table count. */
export const VENUE_FLOOR_STAGGER_PATTERNS: Readonly<Record<number, readonly (readonly number[])[]>> = {
  3: [[2, 1], [3]],
  7: [[4, 3], [3, 4]],
  9: [[3, 3, 3], [5, 4]],
  10: [[3, 4, 3], [5, 5], [4, 3, 3]],
  11: [[4, 3, 4], [5, 3, 3], [4, 4, 3]],
  12: [[4, 4, 4], [5, 4, 3]],
  13: [[4, 5, 4], [5, 5, 3]],
  14: [[5, 4, 5], [5, 5, 4]],
  15: [[5, 5, 5], [5, 4, 3, 3]],
  16: [[4, 4, 4, 4], [5, 4, 4, 3], [5, 5, 3, 3]],
  17: [[5, 5, 4, 3], [5, 4, 4, 4]],
  18: [[5, 4, 5, 4], [5, 5, 4, 4], [5, 5, 5, 3]],
  19: [[5, 5, 5, 4], [5, 5, 4, 5]],
  20: [[5, 5, 5, 5], [5, 5, 4, 3, 3]],
}

/** QA-locked honeycomb / stagger row patterns — must win over felt-area scoring. */
const LOCKED_FLOOR_ROW_PATTERN: Readonly<Partial<Record<number, string>>> = {
  3: '2-1',
  9: '3-3-3',
  10: '3-4-3',
  11: '4-3-4',
  12: '4-4-4',
  13: '4-5-4',
  14: '5-4-5',
  16: '4-4-4-4',
  18: '5-4-5-4',
}

const LOCKED_FLOOR_ROW_PATTERN_BONUS = 3_200

export type VenueFloorLayoutViewport = {
  widthPx: number
  heightPx: number
}

export type VenueFloorLayoutPlan = {
  /** Widest row — used for uniform card slot width across all rows. */
  columns: number
  rowCount: number
  /** Tables per row, e.g. [5, 4, 5] for fourteen tables. */
  rowSizes: number[]
  tableCount: number
  density: VenueFloorTableSize
  staggered: boolean
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

function uniformRowSizes(tableCount: number, columns: number): number[] {
  const cols = Math.max(1, columns)
  const rows: number[] = []
  let remaining = tableCount
  while (remaining > 0) {
    rows.push(Math.min(cols, remaining))
    remaining -= cols
  }
  return rows
}

function candidateColumnCounts(tableCount: number): number[] {
  const n = Math.max(0, Math.min(VENUE_FLOOR_GRID_MAX_TABLES, Math.floor(tableCount)))
  if (n <= 0) return [1]
  if (n === 1) return [1]
  if (n === 3) return [2]
  /** Four tables — never a single full-width row (portrait tiles, bad showdown stage). */
  if (n === 4) return [2]
  const max = Math.min(MAX_COLUMNS, n)
  return Array.from({ length: max - 1 }, (_, i) => i + 2)
}

type LayoutCandidate = {
  rowSizes: number[]
  columns: number
  rowCount: number
  staggered: boolean
}

function layoutCandidates(tableCount: number): LayoutCandidate[] {
  const seen = new Set<string>()
  const out: LayoutCandidate[] = []

  const add = (rowSizes: number[]) => {
    const sum = rowSizes.reduce((a, b) => a + b, 0)
    if (sum !== tableCount) return
    const key = rowSizes.join(',')
    if (seen.has(key)) return
    seen.add(key)
    const columns = Math.max(...rowSizes)
    const staggered = new Set(rowSizes).size > 1
    out.push({ rowSizes, columns, rowCount: rowSizes.length, staggered })
  }

  for (const pattern of VENUE_FLOOR_STAGGER_PATTERNS[tableCount] ?? []) {
    add([...pattern])
  }
  for (const columns of candidateColumnCounts(tableCount)) {
    add(uniformRowSizes(tableCount, columns))
  }

  return out
}

function staggerPatternBonus(tableCount: number, rowSizes: number[]): number {
  const key = rowSizes.join('-')
  if (LOCKED_FLOOR_ROW_PATTERN[tableCount] === key) return LOCKED_FLOOR_ROW_PATTERN_BONUS
  if (tableCount === 7 && key === '4-3') return 900
  if (rowSizes.length >= 3 && new Set(rowSizes).size > 1) {
    const max = Math.max(...rowSizes)
    const min = Math.min(...rowSizes)
    if (max - min === 1) return 450
  }
  return 0
}

function countOnlyLayoutScore(tableCount: number, candidate: LayoutCandidate): number {
  const { columns, rowCount, rowSizes } = candidate
  const preferred = venueFloorPreferredColumns(tableCount)
  let score = 10_000
  score -= rowCount * 620
  score -= Math.abs(columns - preferred) * 240
  if (tableCount > 8 && columns >= 5) score += 180
  if (tableCount <= 6 && columns === 3 && rowCount === 2) score += 220
  if (tableCount === 4 && rowCount === 2 && columns === 2) score += 1_200
  if (tableCount === 3 && rowCount === 2 && columns === 2) score += 600
  score += staggerPatternBonus(tableCount, rowSizes)
  return score
}

function viewportLayoutScore(
  tableCount: number,
  candidate: LayoutCandidate,
  viewport: VenueFloorLayoutViewport,
  withHeadline: boolean
): number {
  const { columns, rowCount, rowSizes } = candidate
  const gapPx = 14
  const availW = Math.max(0, viewport.widthPx - GRID_INSET_PX)
  const availH = Math.max(
    0,
    viewport.heightPx - GRID_INSET_PX - (withHeadline ? HEADLINE_RESERVE_PX : 0)
  )
  if (availW <= 0 || availH <= 0) {
    return countOnlyLayoutScore(tableCount, candidate)
  }

  const cellW = (availW - (columns - 1) * gapPx) / columns
  const cellH = (availH - (rowCount - 1) * gapPx) / rowCount
  const feltH = Math.min(cellH - CARD_CHROME_PX, (cellW * 0.92) / FELT_ASPECT)
  const feltW = feltH * FELT_ASPECT

  if (feltW < MIN_FELT_WIDTH_PX || feltH < MIN_FELT_HEIGHT_PX) return Number.NEGATIVE_INFINITY

  let score = feltW * feltH
  score -= rowCount * 420
  score -= Math.abs(columns - venueFloorPreferredColumns(tableCount)) * 120
  if (tableCount === 4 && rowCount === 2 && columns === 2) score += 8_000
  if (LOCKED_FLOOR_ROW_PATTERN[tableCount] === rowSizes.join('-')) score += 100_000
  score += staggerPatternBonus(tableCount, rowSizes)
  return score
}

/**
 * Choose row grouping / density for the venue wagering floor.
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
    return {
      columns: 1,
      rowCount: 0,
      rowSizes: [],
      tableCount: 0,
      density: 'hero',
      staggered: false,
    }
  }

  let best = layoutCandidates(tableCount)[0]!
  let bestScore = Number.NEGATIVE_INFINITY

  for (const candidate of layoutCandidates(tableCount)) {
    const score =
      opts.viewport != null
        ? viewportLayoutScore(tableCount, candidate, opts.viewport, opts.withHeadline === true)
        : countOnlyLayoutScore(tableCount, candidate)
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return {
    columns: best.columns,
    rowCount: best.rowCount,
    rowSizes: best.rowSizes,
    tableCount,
    density: venueFloorDensityForCount(tableCount),
    staggered: best.staggered,
  }
}

/** Subtle card shrink — pairs with headline gap tuning for a bit more breathing room. */
export const VENUE_FLOOR_CARD_SLOT_SCALE = 0.97

/** Slot width for a card — sized to the floor's widest row so partial rows stay uniform and centered. */
export function venueFloorCardSlotWidthCss(columns: number, cellGapRem: number): string {
  const cols = Math.max(1, columns)
  const gaps = cols > 1 ? `(${cols} - 1) * ${cellGapRem}rem` : '0rem'
  const base = `(100% - ${gaps}) / ${cols}`
  return `calc((${base}) * ${VENUE_FLOOR_CARD_SLOT_SCALE})`
}

/** Slice tiles into explicit row groups, e.g. [5, 4, 5]. */
export function chunkTilesIntoRowGroups<T>(tiles: T[], rowSizes: number[]): T[][] {
  const rows: T[][] = []
  let index = 0
  for (const size of rowSizes) {
    rows.push(tiles.slice(index, index + size))
    index += size
  }
  return rows
}
