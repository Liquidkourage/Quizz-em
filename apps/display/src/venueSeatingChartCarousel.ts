/** Tables visible on one seating-chart screen before advancing the carousel. */
export const SEATING_CHART_PAGE_TABLES = 5

/** Dwell time on each page (ms) — long enough to scan a page from the back of the room. */
export const SEATING_CHART_PAGE_MS = 10_000

/** Max width of the seating page content area. */
export const SEATING_CHART_GRID_MAX_WIDTH_REM = 80

/** Horizontal gap between cards — spacing only; card width is fixed separately. */
export const SEATING_CHART_GAP_X_REM = 2.75

/**
 * Fixed card width from the row (three cards + two gaps).
 * Does not shrink when gap increases — gap is spacing-only.
 */
export const SEATING_CHART_ROW_WIDTH_CSS = `min(100%, ${SEATING_CHART_GRID_MAX_WIDTH_REM}rem)`

export const SEATING_CHART_CARD_WIDTH_CSS = `calc((${SEATING_CHART_ROW_WIDTH_CSS} - 2 * ${SEATING_CHART_GAP_X_REM}rem) / 3)`

/** Full W-formation frame — centered in the viewport. */
export const SEATING_CHART_FRAME_WIDTH_CSS = SEATING_CHART_ROW_WIDTH_CSS

/** Left edge of bottom card 4 (between top cards 1 and 2). */
export const SEATING_CHART_W_CARD4_LEFT_CSS = `calc(${SEATING_CHART_CARD_WIDTH_CSS} / 2 + ${SEATING_CHART_GAP_X_REM}rem / 2)`

/** Left edge of bottom card 5 (between top cards 2 and 3). */
export const SEATING_CHART_W_CARD5_LEFT_CSS = `calc(${SEATING_CHART_CARD_WIDTH_CSS} * 1.5 + ${SEATING_CHART_GAP_X_REM}rem * 1.5)`

/** Left edge of a lone bottom card (under top card 2). */
export const SEATING_CHART_W_SINGLE_BOTTOM_LEFT_CSS = `calc(${SEATING_CHART_CARD_WIDTH_CSS} + ${SEATING_CHART_GAP_X_REM}rem)`

export type SeatingChartWRows = {
  topIndices: number[]
  bottomIndices: number[]
}

export function seatingChartPageCount(tableCount: number): number {
  const n = Math.max(0, Math.floor(tableCount))
  if (n <= SEATING_CHART_PAGE_TABLES) return 1
  return Math.ceil(n / SEATING_CHART_PAGE_TABLES)
}

export function seatingChartPageTables<T>(tables: readonly T[], pageIndex: number): T[] {
  const pages = seatingChartPageCount(tables.length)
  const safePage = ((pageIndex % pages) + pages) % pages
  const start = safePage * SEATING_CHART_PAGE_TABLES
  return tables.slice(start, start + SEATING_CHART_PAGE_TABLES)
}

/** Split page tables into top (up to 3) and staggered bottom rows for the W formation. */
export function seatingChartWFormationRows(tableCountOnPage: number): SeatingChartWRows {
  const n = Math.max(0, Math.min(tableCountOnPage, SEATING_CHART_PAGE_TABLES))
  if (n <= 3) {
    return { topIndices: Array.from({ length: n }, (_, i) => i), bottomIndices: [] }
  }
  if (n === 4) {
    return { topIndices: [0, 1, 2], bottomIndices: [3] }
  }
  return { topIndices: [0, 1, 2], bottomIndices: [3, 4] }
}

/** Absolute left position for each bottom-row card in the W formation. */
export function seatingChartWBottomLeftCss(bottomSlotIndex: number, bottomCount: number): string {
  if (bottomCount === 1) return SEATING_CHART_W_SINGLE_BOTTOM_LEFT_CSS
  return bottomSlotIndex === 0 ? SEATING_CHART_W_CARD4_LEFT_CSS : SEATING_CHART_W_CARD5_LEFT_CSS
}

export function seatingChartPageLabel(
  pageIndex: number,
  tableCount: number
): { page: number; pageCount: number; tableRange: string } {
  const pageCount = seatingChartPageCount(tableCount)
  const safePage = Math.min(Math.max(0, pageIndex), pageCount - 1)
  const start = safePage * SEATING_CHART_PAGE_TABLES + 1
  const end = Math.min(tableCount, (safePage + 1) * SEATING_CHART_PAGE_TABLES)
  return {
    page: safePage + 1,
    pageCount,
    tableRange: start === end ? `${start}` : `${start}–${end}`,
  }
}
