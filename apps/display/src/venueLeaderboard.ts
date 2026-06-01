import { VENUE_WALL_SEAT_SLOTS } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

export type VenueLeaderboardRow = {
  name: string
  tableNum: number
  seatNum: number
  bankroll: number
}

export function formatVenueBankroll(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
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

/** Ranked by stack (desc); tie-break name then table/seat. */
export function venueLeaderboardRowsFromTiles(
  tiles: DisplayVenueTileSnapshot[]
): VenueLeaderboardRow[] {
  const out: VenueLeaderboardRow[] = []
  for (const t of tiles) {
    const sn = t.seatNames
    const br = padSeatBankrolls(t.seatBankrolls)
    if (sn == null || sn.length === 0) continue
    for (let i = 0; i < sn.length; i++) {
      const raw = sn[i]?.trim()
      if (raw) out.push({ name: raw, tableNum: t.tableNum, seatNum: i + 1, bankroll: br[i] ?? 0 })
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

/** Column count so ~130 players fit one TV viewport. */
export function venueLeaderboardColumns(playerCount: number): number {
  const n = Math.max(0, Math.floor(playerCount))
  if (n <= 16) return 2
  if (n <= 36) return 3
  if (n <= 72) return 4
  if (n <= 110) return 5
  return 6
}
