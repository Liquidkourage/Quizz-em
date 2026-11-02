/** Max table placards per carousel page on wide venue displays (1920×1080+). */
export const SEATING_CHART_PAGE_TABLES = 3

/** Max placards per page on narrower displays (1366×768) when three would crowd readability. */
export const SEATING_CHART_PAGE_TABLES_NARROW = 2

/** Viewport width at or above which three portrait cards fit comfortably. */
export const SEATING_CHART_WIDE_VIEWPORT_PX = 1600

/** Dwell time on each table-card page (ms). */
export const SEATING_CHART_PAGE_MS = 10_000

export function seatingChartDwellSeconds(durationMs: number): number {
  return Math.max(1, Math.round(durationMs / 1000))
}

/** One second of a paging clock. At 1 the next page starts and the clock refills. */
export function pagedCountdownTick(
  paging: { pageIndex: number; secondsLeft: number },
  pageCount: number,
  dwellSeconds: number,
): { pageIndex: number; secondsLeft: number } {
  if (pageCount <= 1) return { pageIndex: 0, secondsLeft: 0 }
  if (paging.secondsLeft > 1) return { pageIndex: paging.pageIndex, secondsLeft: paging.secondsLeft - 1 }
  const pages = Math.max(1, pageCount)
  return { pageIndex: (paging.pageIndex + 1) % pages, secondsLeft: dwellSeconds }
}

export function seatingChartPageSizeForViewport(viewportWidth: number): number {
  return viewportWidth >= SEATING_CHART_WIDE_VIEWPORT_PX
    ? SEATING_CHART_PAGE_TABLES
    : SEATING_CHART_PAGE_TABLES_NARROW
}

export function seatingChartPageCount(
  tableCount: number,
  pageSize: number = SEATING_CHART_PAGE_TABLES,
): number {
  const n = Math.max(0, Math.floor(tableCount))
  const size = Math.max(1, Math.floor(pageSize))
  if (n <= size) return 1
  return Math.ceil(n / size)
}

export function seatingChartPageTables<T>(
  tables: readonly T[],
  pageIndex: number,
  pageSize: number = SEATING_CHART_PAGE_TABLES,
): T[] {
  const pages = seatingChartPageCount(tables.length, pageSize)
  const safePage = ((pageIndex % pages) + pages) % pages
  const size = Math.max(1, Math.floor(pageSize))
  const start = safePage * size
  return tables.slice(start, start + size)
}

export function seatingChartPageLabel(
  pageIndex: number,
  tableCount: number,
  pageSize: number = SEATING_CHART_PAGE_TABLES,
): { page: number; pageCount: number; tableRange: string } {
  const pages = seatingChartPageCount(tableCount, pageSize)
  const safePage = Math.min(Math.max(0, pageIndex), pages - 1)
  const size = Math.max(1, Math.floor(pageSize))
  const start = safePage * size + 1
  const end = Math.min(tableCount, (safePage + 1) * size)
  return {
    page: safePage + 1,
    pageCount: pages,
    tableRange: start === end ? `${start}` : `${start}–${end}`,
  }
}
