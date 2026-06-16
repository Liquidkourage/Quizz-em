/** Tables visible on one seating-chart screen before advancing the carousel. */
export const SEATING_CHART_PAGE_TABLES = 6

/** Dwell time on each page (ms) — long enough to scan ~6 tables from the back of the room. */
export const SEATING_CHART_PAGE_MS = 10_000

export type SeatingChartPageGrid = {
  columns: number
  rowCount: number
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

/** Grid for the tables on the current page — at most 3×2 for six tables. */
export function seatingChartPageGrid(tableCountOnPage: number): SeatingChartPageGrid {
  const n = Math.max(0, Math.floor(tableCountOnPage))
  if (n <= 1) return { columns: 1, rowCount: 1 }
  if (n <= 2) return { columns: 2, rowCount: 1 }
  if (n <= 4) return { columns: 2, rowCount: 2 }
  return { columns: 3, rowCount: 2 }
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
