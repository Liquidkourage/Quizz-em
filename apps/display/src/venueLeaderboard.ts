import { VENUE_WALL_SEAT_SLOTS } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

export type VenueLeaderboardRow = {
  name: string
  tableNum: number
  seatNum: number
  bankroll: number
  /** Change vs stack at hand start; null when no baseline yet. */
  stackDelta: number | null
}

export function venueLeaderboardPlayerKey(tableNum: number, seatNum: number, name: string): string {
  return `${tableNum}:${seatNum}:${name.trim()}`
}

export function formatVenueBankroll(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
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

/** Ranked by stack (desc); tie-break name then table/seat. */
export function venueLeaderboardRowsFromTiles(
  tiles: DisplayVenueTileSnapshot[],
  handStartBaselines?: ReadonlyMap<string, number> | null
): VenueLeaderboardRow[] {
  const out: VenueLeaderboardRow[] = []
  for (const t of tiles) {
    const sn = t.seatNames
    const br = padSeatBankrolls(t.seatBankrolls)
    if (sn == null || sn.length === 0) continue
    for (let i = 0; i < sn.length; i++) {
      const raw = sn[i]?.trim()
      if (!raw) continue
      const bankroll = br[i] ?? 0
      const key = venueLeaderboardPlayerKey(t.tableNum, i + 1, raw)
      const baseline = handStartBaselines?.get(key)
      out.push({
        name: raw,
        tableNum: t.tableNum,
        seatNum: i + 1,
        bankroll,
        stackDelta: baseline != null ? bankroll - baseline : null,
      })
    }
  }
  out.sort((a, b) => {
    if (b.bankroll !== a.bankroll) return b.bankroll - a.bankroll
    const c = comparePlayersByFirstNameThenFullName(a, b)
    if (c !== 0) return c
    if (a.tableNum !== b.tableNum) return a.tableNum - b.tableNum
    return a.seatNum - b.seatNum
  })
  return out
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
  averageStack: number
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
  const sum = stacks.reduce((acc, v) => acc + v, 0)
  const mid = Math.floor(stacks.length / 2)
  const median =
    stacks.length % 2 === 0 ? Math.round((stacks[mid - 1]! + stacks[mid]!) / 2) : stacks[mid]!
  const top = rows[0]!
  return {
    topName: top.name,
    topStack: top.bankroll,
    averageStack: Math.round(sum / stacks.length),
    medianStack: median,
    liveTables: Math.max(0, Math.floor(liveTables)),
  }
}
