import type { VenueSeatingChartTable } from './venueWallModel'

export type SeatingChartPlayerEntry = {
  name: string
  tableNum: number
  seatNum: number
}

/** @deprecated Rosters now flex to fill gutter columns; kept for tests/docs reference only. */
export const SEATING_CHART_ROSTER_WIDTH_REM = 13.5

/** Players per roster carousel page — tuned for compact gutter rows on a venue display. */
export const SEATING_CHART_ROSTER_PAGE_SIZE = 22

/** Dwell time on each roster page (ms). */
export const SEATING_CHART_ROSTER_PAGE_MS = 8_000

export function seatingChartPlayerEntries(
  tables: readonly VenueSeatingChartTable[]
): SeatingChartPlayerEntry[] {
  const out: SeatingChartPlayerEntry[] = []
  for (const table of tables) {
    for (const seat of table.seats) {
      out.push({
        name: seat.name,
        tableNum: table.tableNum,
        seatNum: seat.seatNum,
      })
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  return out
}

export function seatingChartRosterBucket(name: string): 'am' | 'nz' {
  const first = name.trim().charAt(0).toUpperCase()
  if (!first || !/[A-Z]/.test(first)) return 'nz'
  return first <= 'M' ? 'am' : 'nz'
}

export function seatingChartRosterHalves(entries: readonly SeatingChartPlayerEntry[]): {
  am: SeatingChartPlayerEntry[]
  nz: SeatingChartPlayerEntry[]
} {
  const am: SeatingChartPlayerEntry[] = []
  const nz: SeatingChartPlayerEntry[] = []
  for (const entry of entries) {
    if (seatingChartRosterBucket(entry.name) === 'am') am.push(entry)
    else nz.push(entry)
  }
  return { am, nz }
}

export function seatingChartRosterPageCount(entryCount: number): number {
  const n = Math.max(0, Math.floor(entryCount))
  if (n <= 0) return 0
  return Math.ceil(n / SEATING_CHART_ROSTER_PAGE_SIZE)
}

export function seatingChartRosterPageEntries<T>(
  entries: readonly T[],
  pageIndex: number
): T[] {
  const pages = seatingChartRosterPageCount(entries.length)
  if (pages <= 0) return []
  const safePage = ((pageIndex % pages) + pages) % pages
  const start = safePage * SEATING_CHART_ROSTER_PAGE_SIZE
  return entries.slice(start, start + SEATING_CHART_ROSTER_PAGE_SIZE)
}
