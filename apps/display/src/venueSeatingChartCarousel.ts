/** Tables visible on one seating-chart screen before advancing the carousel. */
export const SEATING_CHART_PAGE_TABLES = 5

/** Dwell time on each page (ms) — long enough to scan a page from the back of the room. */
export const SEATING_CHART_PAGE_MS = 10_000

/** Centered grid — wide enough for W formation with horizontal breathing room. */
export const SEATING_CHART_GRID_MAX_WIDTH_REM = 88

/** 10-column track grid: each card spans 2 tracks with a gutter track between neighbors. */
export const SEATING_CHART_W_TRACK_COLUMNS = 10

export type SeatingChartWSlot = {
  gridColumn: string
  gridRow: number
}

export type SeatingChartWFormationLayout = {
  rowCount: number
  trackColumns: number
  slots: SeatingChartWSlot[]
}

/** Full W: three on top, two staggered on the bottom with gutter columns between cards. */
const W_FORMATION_FULL: SeatingChartWSlot[] = [
  { gridColumn: '1 / 3', gridRow: 1 },
  { gridColumn: '4 / 6', gridRow: 1 },
  { gridColumn: '7 / 9', gridRow: 1 },
  { gridColumn: '3 / 5', gridRow: 2 },
  { gridColumn: '6 / 8', gridRow: 2 },
]

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

/** W-formation placement for 1–5 tables on the current page. */
export function seatingChartWFormationLayout(tableCountOnPage: number): SeatingChartWFormationLayout {
  const n = Math.max(0, Math.min(tableCountOnPage, SEATING_CHART_PAGE_TABLES))
  const tracks = SEATING_CHART_W_TRACK_COLUMNS

  if (n <= 0) {
    return { rowCount: 1, trackColumns: tracks, slots: [] }
  }
  if (n === 1) {
    return {
      rowCount: 1,
      trackColumns: tracks,
      slots: [{ gridColumn: '4 / 6', gridRow: 1 }],
    }
  }
  if (n === 2) {
    return {
      rowCount: 1,
      trackColumns: tracks,
      slots: [
        { gridColumn: '3 / 5', gridRow: 1 },
        { gridColumn: '6 / 8', gridRow: 1 },
      ],
    }
  }
  if (n === 3) {
    return {
      rowCount: 1,
      trackColumns: tracks,
      slots: W_FORMATION_FULL.slice(0, 3),
    }
  }
  if (n === 4) {
    return {
      rowCount: 2,
      trackColumns: tracks,
      slots: [
        ...W_FORMATION_FULL.slice(0, 3),
        { gridColumn: '4 / 6', gridRow: 2 },
      ],
    }
  }
  return {
    rowCount: 2,
    trackColumns: tracks,
    slots: W_FORMATION_FULL,
  }
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
