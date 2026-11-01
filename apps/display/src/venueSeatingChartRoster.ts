import type { VenueSeatingChartTable } from './venueWallModel'

export type SeatingChartPlayerEntry = {
  name: string
  tableNum: number
  seatNum: number
}

/** Fixed width for left/right roster gutters (center stage keeps portrait placards). */
export const SEATING_CHART_ROSTER_WIDTH_REM = 12

/** Players per roster page. Fewer rows so each name and caption stay TV-readable. */
export const SEATING_CHART_ROSTER_PAGE_SIZE = 9

/** Name line in the A–M / N–Z gutters. */
export const SEATING_CHART_ROSTER_NAME_FONT = 'clamp(1.7rem, 3.1vh, 2.35rem)'

/** "Table N, Seat N" under each gutter name. */
export const SEATING_CHART_ROSTER_CAPTION_FONT = 'clamp(1.15rem, 2.15vh, 1.6rem)'

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
