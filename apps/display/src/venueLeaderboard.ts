import { formatTriviaPointsLine, roundTriviaPoints, VENUE_WALL_SEAT_SLOTS } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

export type VenueLeaderboardRow = {
  name: string
  tableNum: number
  seatNum: number
  bankroll: number
  /** Change vs stack at hand start; null when no baseline yet. */
  stackDelta: number | null
  /** Cumulative trivia points — set on trivia-ranked boards. */
  answerPoints?: number
}

export type VenueLeaderboardTrophy = 'chips' | 'trivia'

export function venueLeaderboardPlayerKey(tableNum: number, seatNum: number, name: string): string {
  return `${tableNum}:${seatNum}:${name.trim()}`
}

export function formatVenueBankroll(amount: number): string {
  return `$${formatVenueBankrollDigits(amount)}`
}

/** Public venue display — first name + surname initial (e.g. `Alice S.`). */
export function formatVenueDisplayPlayerName(fullName: string): string {
  const t = fullName.trim()
  if (!t) return ''
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? t
  const tail = parts[parts.length - 1]!
  if (/^\d+$/.test(tail)) {
    const base = formatVenueDisplayPlayerName(parts.slice(0, -1).join(' '))
    return base ? `${base} ${tail}` : tail
  }
  const first = parts[0]!
  const initial = tail.replace(/\./g, '').charAt(0).toUpperCase()
  if (!initial) return first
  return `${first} ${initial}.`
}

/** Digits only (no currency sign) — pairs with mosaic Bungee dollar markup. */
export function formatVenueBankrollDigits(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return Math.max(0, n).toLocaleString()
}

export function formatVenueStackDelta(delta: number): string {
  const n = Number.isFinite(delta) ? Math.round(delta) : 0
  if (n === 0) return '±0'
  const sign = n > 0 ? '+' : '−'
  return `${sign}$${Math.abs(n).toLocaleString()}`
}

function padSeatBankrolls(raw: number[] | undefined): number[] {
  return Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  })
}

function padSeatAnswerPoints(raw: number[] | undefined): number[] {
  return Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? roundTriviaPoints(v) : 0
  })
}

function firstNameSortKey(displayName: string): string {
  const t = displayName.trim()
  if (!t) return ''
  return t.split(/\s+/)[0] ?? t
}

function comparePlayersByFirstNameThenFullName(a: { name: string }, b: { name: string }): number {
  const cmp = firstNameSortKey(a.name).localeCompare(firstNameSortKey(b.name), undefined, {
    sensitivity: 'base',
  })
  if (cmp !== 0) return cmp
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

export function venueWallGameplayActive(tiles: DisplayVenueTileSnapshot[]): boolean {
  return tiles.some((t) => t.phase !== 'lobby')
}

export function captureVenueHandStackBaselines(tiles: DisplayVenueTileSnapshot[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of tiles) {
    const sn = t.seatNames
    const br = padSeatBankrolls(t.seatBankrolls)
    if (sn == null || sn.length === 0) continue
    for (let i = 0; i < sn.length; i++) {
      const raw = sn[i]?.trim()
      if (!raw) continue
      out.set(venueLeaderboardPlayerKey(t.tableNum, i + 1, raw), br[i] ?? 0)
    }
  }
  return out
}

function compareRank(delta: number, a: VenueLeaderboardRow, b: VenueLeaderboardRow): number {
  if (delta !== 0) return delta
  const nameOrder = comparePlayersByFirstNameThenFullName(a, b)
  if (nameOrder !== 0) return nameOrder
  if (a.tableNum !== b.tableNum) return a.tableNum - b.tableNum
  return a.seatNum - b.seatNum
}

function rankRows(
  rows: VenueLeaderboardRow[],
  score: (row: VenueLeaderboardRow) => number,
): VenueLeaderboardRow[] {
  return rows.sort((a, b) => compareRank(score(b) - score(a), a, b))
}

function chipSeatRow(
  tile: DisplayVenueTileSnapshot,
  index: number,
  bankrolls: readonly number[],
  points: readonly number[],
  baselines: ReadonlyMap<string, number> | null | undefined,
): VenueLeaderboardRow | null {
  const name = tile.seatNames?.[index]?.trim()
  if (!name || tile.seatPointsOnly?.[index] === true) return null
  const bankroll = bankrolls[index] ?? 0
  const baseline = baselines?.get(venueLeaderboardPlayerKey(tile.tableNum, index + 1, name))
  return {
    name,
    tableNum: tile.tableNum,
    seatNum: index + 1,
    bankroll,
    stackDelta: baseline != null ? bankroll - baseline : null,
    answerPoints: points[index] ?? 0,
  }
}

function appendChipContestSeats(
  out: VenueLeaderboardRow[],
  tiles: readonly DisplayVenueTileSnapshot[],
  baselines: ReadonlyMap<string, number> | null | undefined,
): void {
  for (const tile of tiles) {
    const names = tile.seatNames
    if (names == null || names.length === 0) continue
    const bankrolls = padSeatBankrolls(tile.seatBankrolls)
    const points = padSeatAnswerPoints(tile.seatAnswerPoints)
    for (let index = 0; index < names.length; index++) {
      const row = chipSeatRow(tile, index, bankrolls, points, baselines)
      if (row) out.push(row)
    }
  }
}

function pointsOnlySeatRow(tile: DisplayVenueTileSnapshot, index: number): VenueLeaderboardRow | null {
  const name = tile.seatNames?.[index]?.trim()
  if (!name || tile.seatPointsOnly?.[index] !== true) return null
  return {
    name,
    tableNum: tile.tableNum,
    seatNum: index + 1,
    bankroll: padSeatBankrolls(tile.seatBankrolls)[index] ?? 0,
    stackDelta: null,
    answerPoints: padSeatAnswerPoints(tile.seatAnswerPoints)[index] ?? 0,
  }
}

function appendPointsOnlySeats(out: VenueLeaderboardRow[], tiles: readonly DisplayVenueTileSnapshot[]): void {
  for (const tile of tiles) {
    const names = tile.seatNames
    if (names == null || names.length === 0) continue
    for (let index = 0; index < names.length; index++) {
      const row = pointsOnlySeatRow(tile, index)
      if (row) out.push(row)
    }
  }
}

/** Ranked by stack (desc); tie-break name then table/seat. */
export function venueLeaderboardRowsFromTiles(
  tiles: DisplayVenueTileSnapshot[],
  handStartBaselines?: ReadonlyMap<string, number> | null,
): VenueLeaderboardRow[] {
  const rows: VenueLeaderboardRow[] = []
  appendChipContestSeats(rows, tiles, handStartBaselines)
  return rankRows(rows, (row) => row.bankroll)
}

/** Players who left with no stack. The wall snapshot carries them beside the seated tiles. */
export function normalizeVenuePointsStandings(
  raw: unknown,
): { name: string; answerPoints: number }[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: { name: string; answerPoints: number }[] = []
  for (const row of raw) {
    const standing = pointsStandingFromWire(row)
    if (standing) out.push(standing)
  }
  return out.length > 0 ? out : undefined
}

function pointsStandingFromWire(row: unknown): { name: string; answerPoints: number } | null {
  if (row == null || typeof row !== 'object') return null
  const name = typeof (row as { name?: unknown }).name === 'string' ? (row as { name: string }).name.trim() : ''
  if (!name) return null
  const pts = (row as { answerPoints?: unknown }).answerPoints
  const answerPoints = typeof pts === 'number' && Number.isFinite(pts) ? roundTriviaPoints(pts) : 0
  return { name, answerPoints }
}

function appendUnseatedTriviaRows(
  out: VenueLeaderboardRow[],
  standings: readonly { name: string; answerPoints: number }[],
): void {
  let seatNum = 0
  for (const row of standings) {
    const name = row.name.trim()
    if (!name) continue
    seatNum += 1
    const pts = row.answerPoints
    out.push({
      name,
      tableNum: 0,
      seatNum,
      bankroll: 0,
      stackDelta: null,
      answerPoints: Number.isFinite(pts) ? pts : 0,
    })
  }
}

function chipContestNames(tiles: DisplayVenueTileSnapshot[]): Set<string> {
  const names = new Set<string>()
  for (const tile of tiles) {
    const seats = tile.seatNames
    if (seats == null) continue
    for (let i = 0; i < seats.length; i++) {
      const name = seats[i]?.trim()
      if (!name || tile.seatPointsOnly?.[i] === true) continue
      names.add(name.toLowerCase())
    }
  }
  return names
}

function withoutChipPlayers<T extends { name: string }>(
  rows: readonly T[],
  chips: ReadonlySet<string>,
): T[] {
  return rows.filter((row) => !chips.has(row.name.trim().toLowerCase()))
}

export function triviaLeaderboardSource(
  tiles: DisplayVenueTileSnapshot[],
  standings: readonly { name: string; answerPoints: number }[],
  field: readonly { name: string; answerPoints: number }[] | null | undefined,
): VenueLeaderboardRow[] {
  const chips = chipContestNames(tiles)
  if (field != null && field.length > 0) {
    return venueTriviaLeaderboardRowsFromTiles([], withoutChipPlayers(field, chips))
  }
  return venueTriviaLeaderboardRowsFromTiles(tiles, withoutChipPlayers(standings, chips))
}

/** Ranked by trivia answer points (desc). Chip contestants stay on the chip board. */
export function venueTriviaLeaderboardRowsFromTiles(
  tiles: DisplayVenueTileSnapshot[],
  standings: readonly { name: string; answerPoints: number }[] = [],
): VenueLeaderboardRow[] {
  const rows: VenueLeaderboardRow[] = []
  appendPointsOnlySeats(rows, tiles)
  appendUnseatedTriviaRows(rows, withoutChipPlayers(standings, chipContestNames(tiles)))
  return rankRows(rows, (row) => row.answerPoints ?? 0)
}

export function formatVenueTriviaPoints(amount: number): string {
  return formatTriviaPointsLine(amount)
}

  /** @deprecated Use {@link buildVenueLeaderboardPresentation} — capped at 4 columns via pagination. */
export function venueLeaderboardColumns(playerCount: number): number {
  const n = Math.max(0, Math.floor(playerCount))
  if (n <= 8) return 1
  if (n <= 16) return 2
  if (n <= 32) return 2
  if (n <= 48) return 3
  return 4
}

/** @deprecated Use column.rankStart/rankEnd from presentation model. */
export function venueLeaderboardColumnRangeLabel(
  colIndex: number,
  rowCount: number,
  totalPlayers: number
): string {
  const start = colIndex * rowCount + 1
  const end = Math.min((colIndex + 1) * rowCount, totalPlayers)
  return start === end ? `${start}` : `${start}–${end}`
}

/** @deprecated Use {@link venueLeaderboardSplitPageColumns}. */
export function venueLeaderboardSplitColumns(
  rows: readonly VenueLeaderboardRow[],
  columnCount: number
): { columns: VenueLeaderboardRow[][]; rowCount: number } {
  const n = rows.length
  const cols = Math.min(4, Math.max(1, columnCount))
  const rowCount = Math.min(16, Math.max(1, Math.ceil(n / cols)))
  const columns: VenueLeaderboardRow[][] = Array.from({ length: cols }, () => [])
  for (let i = 0; i < n; i++) {
    const colIndex = Math.floor(i / rowCount)
    columns[colIndex]!.push(rows[i]!)
  }
  return { columns: columns.filter((c) => c.length > 0), rowCount }
}

export type VenueLeaderboardFooterStats = {
  topName: string
  topStack: number
  medianStack: number
  liveTables: number
}

/** Client-side footer stats from ranked rows — no API changes. */
export function venueLeaderboardFooterStats(
  rows: readonly VenueLeaderboardRow[],
  liveTables: number
): VenueLeaderboardFooterStats | null {
  if (rows.length === 0) return null
  const stacks = rows.map((r) => r.bankroll).sort((a, b) => a - b)
  const mid = Math.floor(stacks.length / 2)
  const median =
    stacks.length % 2 === 0 ? Math.round((stacks[mid - 1]! + stacks[mid]!) / 2) : stacks[mid]!
  const top = rows[0]!
  return {
    topName: top.name,
    topStack: top.bankroll,
    medianStack: median,
    liveTables: Math.max(0, Math.floor(liveTables)),
  }
}
