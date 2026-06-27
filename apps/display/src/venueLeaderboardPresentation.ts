import type { VenueLeaderboardRow } from './venueLeaderboard'

/** Hard caps for readable eagle-eye leaderboard at 1920×1080. */
export const LEADERBOARD_MAX_PLAYERS_PER_PAGE = 64
export const LEADERBOARD_MAX_COLUMNS = 4
export const LEADERBOARD_MAX_ROWS_PER_COLUMN = 16

/** Auto-rotation dwell — page 1 shows leaders longer. */
export const LEADERBOARD_PAGE1_MS = 12_000
export const LEADERBOARD_PAGE_MS = 9_000

export type VenueLeaderboardRankedPlayer = VenueLeaderboardRow & { rank: number }

export type VenueLeaderboardColumnModel = {
  rankStart: number
  rankEnd: number
  players: VenueLeaderboardRankedPlayer[]
  /** Row count for this column's grid and container-query typography. */
  gridRowCount: number
}

export type VenueLeaderboardPageModel = {
  pageNumber: number
  pageCount: number
  rankStart: number
  rankEnd: number
  columns: VenueLeaderboardColumnModel[]
  columnCount: number
  /** True when this page includes global ranks 1–3 (first page only). */
  showTopThreePodium: boolean
}

export type VenueLeaderboardPresentationModel = {
  pages: VenueLeaderboardPageModel[]
  totalPlayers: number
}

/** First-page column count switches to four-up at this size (up to 64 on one page). */
export const LEADERBOARD_FULL_FIELD_MIN_PLAYERS = 49

/** Column count for one page — never exceeds {@link LEADERBOARD_MAX_COLUMNS}. */
export function venueLeaderboardPageColumnCount(
  playerCountOnPage: number,
  isFirstPage: boolean
): number {
  const n = Math.max(0, Math.floor(playerCountOnPage))
  if (n <= 0) return 1

  if (!isFirstPage) {
    if (n <= 16) return 1
    if (n <= 32) return 2
    if (n <= 48) return 3
    return LEADERBOARD_MAX_COLUMNS
  }

  if (n <= 8) return 1
  if (n <= 16) return 2
  if (n <= 32) return 2
  return LEADERBOARD_MAX_COLUMNS
}

/** Compact chrome when a page approaches the 4×16 full-field cap (e.g. 49–64 players). */
export function venueLeaderboardPageUsesFullFieldLayout(page: VenueLeaderboardPageModel): boolean {
  const playersOnPage = page.rankEnd - page.rankStart + 1
  const maxColumnRows = page.columns.reduce((max, col) => Math.max(max, col.gridRowCount), 0)
  return playersOnPage >= LEADERBOARD_FULL_FIELD_MIN_PLAYERS || maxColumnRows >= 14
}

function attachRanks(rows: readonly VenueLeaderboardRow[], rankOffset: number): VenueLeaderboardRankedPlayer[] {
  return rows.map((row, i) => ({ ...row, rank: rankOffset + i + 1 }))
}

/** Column-major split; range labels derive from actual player ranks in each column. */
export function venueLeaderboardSplitPageColumns(
  players: readonly VenueLeaderboardRankedPlayer[],
  columnCount: number
): VenueLeaderboardColumnModel[] {
  const n = players.length
  if (n === 0) return []

  const cols = Math.min(LEADERBOARD_MAX_COLUMNS, Math.max(1, Math.floor(columnCount)))
  const rowCount = Math.min(LEADERBOARD_MAX_ROWS_PER_COLUMN, Math.max(1, Math.ceil(n / cols)))
  const buckets: VenueLeaderboardRankedPlayer[][] = Array.from({ length: cols }, () => [])

  for (let i = 0; i < n; i++) {
    const colIndex = Math.floor(i / rowCount)
    buckets[colIndex]!.push(players[i]!)
  }

  return buckets
    .filter((col) => col.length > 0)
    .map((col) => ({
      rankStart: col[0]!.rank,
      rankEnd: col[col.length - 1]!.rank,
      players: col,
      /** Per-column row count — drives grid + container-query type (not the page-wide max). */
      gridRowCount: col.length,
    }))
}

export function venueLeaderboardColumnRangeLabel(column: VenueLeaderboardColumnModel): string {
  return column.rankStart === column.rankEnd
    ? `${column.rankStart}`
    : `${column.rankStart}–${column.rankEnd}`
}

export function venueLeaderboardPageCount(totalPlayers: number): number {
  return venueLeaderboardPageSizes(totalPlayers).length
}

/** Fill each page to {@link LEADERBOARD_MAX_PLAYERS_PER_PAGE} before starting the next. */
export function venueLeaderboardPageSizes(totalPlayers: number): number[] {
  const n = Math.max(0, Math.floor(totalPlayers))
  if (n === 0) return []
  if (n <= LEADERBOARD_MAX_PLAYERS_PER_PAGE) return [n]

  const fullPages = Math.floor(n / LEADERBOARD_MAX_PLAYERS_PER_PAGE)
  const remainder = n % LEADERBOARD_MAX_PLAYERS_PER_PAGE

  if (remainder === 0) {
    return Array(fullPages).fill(LEADERBOARD_MAX_PLAYERS_PER_PAGE)
  }

  return [...Array(fullPages).fill(LEADERBOARD_MAX_PLAYERS_PER_PAGE), remainder]
}

function buildLeaderboardPage(
  players: VenueLeaderboardRankedPlayer[],
  pageNumber: number,
  pageCount: number
): VenueLeaderboardPageModel {
  const rankStart = players[0]?.rank ?? 0
  const rankEnd = players[players.length - 1]?.rank ?? 0
  const isFirstPage = pageNumber === 1
  const columnCount = venueLeaderboardPageColumnCount(players.length, isFirstPage)
  const columns = venueLeaderboardSplitPageColumns(players, columnCount)

  return {
    pageNumber,
    pageCount,
    rankStart,
    rankEnd,
    columns,
    columnCount: columns.length,
    showTopThreePodium: isFirstPage && rankStart <= 3,
  }
}

/** Single source of truth for pagination, columns, and range labels. */
export function buildVenueLeaderboardPresentation(
  rows: readonly VenueLeaderboardRow[]
): VenueLeaderboardPresentationModel {
  const totalPlayers = rows.length
  const pageSizes = venueLeaderboardPageSizes(totalPlayers)
  const pageCount = pageSizes.length
  const pages: VenueLeaderboardPageModel[] = []

  let rankOffset = 0
  for (let p = 0; p < pageCount; p++) {
    const size = pageSizes[p]!
    const slice = rows.slice(rankOffset, rankOffset + size)
    const ranked = attachRanks(slice, rankOffset)
    pages.push(buildLeaderboardPage(ranked, p + 1, pageCount))
    rankOffset += size
  }

  return { pages, totalPlayers }
}

export function venueLeaderboardPageLabel(page: VenueLeaderboardPageModel): {
  pageText: string
  rankRangeText: string
} {
  const rankRangeText =
    page.rankStart === page.rankEnd ? `${page.rankStart}` : `${page.rankStart}–${page.rankEnd}`
  return {
    pageText: `Page ${page.pageNumber} of ${page.pageCount}`,
    rankRangeText: `Ranks ${rankRangeText}`,
  }
}

export function venueLeaderboardPageDwellMs(pageNumber: number): number {
  return pageNumber === 1 ? LEADERBOARD_PAGE1_MS : LEADERBOARD_PAGE_MS
}
