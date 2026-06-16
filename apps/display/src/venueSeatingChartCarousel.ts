/** Tables visible on one seating-chart screen before advancing the carousel. */
export const SEATING_CHART_PAGE_TABLES = 5

/** Dwell time on each page (ms) — long enough to scan a page from the back of the room. */
export const SEATING_CHART_PAGE_MS = 10_000

/** Max width of the seating page content area. */
export const SEATING_CHART_GRID_MAX_WIDTH_REM = 80

/** Horizontal gap between cards — spacing only; card width is fixed separately. */
export const SEATING_CHART_GAP_X_REM = 1.75

/**
 * Fixed card width: one third of the top row (three cards + two gaps).
 * Same size as the original 6-track W layout at {@link SEATING_CHART_GRID_MAX_WIDTH_REM}.
 */
export const SEATING_CHART_CARD_WIDTH_CSS = `calc((min(100%, ${SEATING_CHART_GRID_MAX_WIDTH_REM}rem) - 2 * ${SEATING_CHART_GAP_X_REM}rem) / 3)`

/** Bottom-row inset so two cards sit in the W stagger between the top three. */
export const SEATING_CHART_W_BOTTOM_INSET_CSS = `calc(${SEATING_CHART_CARD_WIDTH_CSS} / 2 + ${SEATING_CHART_GAP_X_REM}rem / 2)`

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
