import type { GameState } from '@qhe/core'

/** One saved table: its session key (VENUE:TABLE) and the game state as JSON. */
export interface RoomSnapshotRow {
  sessionKey: string
  stateJson: string
  /** When the row was last saved (epoch ms), if the store knows. */
  savedAtMs?: number
}

/** Bump when the saved shape changes, so an old row is skipped instead of misread. */
export const SNAPSHOT_VERSION = 1

export function toSnapshotRows(rooms: ReadonlyMap<string, GameState>): RoomSnapshotRow[] {
  const rows: RoomSnapshotRow[] = []
  for (const [sessionKey, state] of rooms) {
    rows.push({ sessionKey, stateJson: JSON.stringify({ v: SNAPSHOT_VERSION, state }) })
  }
  return rows
}

function isGameStateShape(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.code === 'string' &&
    typeof v.phase === 'string' &&
    Array.isArray(v.players) &&
    typeof v.round === 'object' &&
    v.round !== null
  )
}

/** Rebuild rooms from saved rows. A damaged or unknown-version row is skipped and reported, never fatal. */
export function fromSnapshotRows(
  rows: readonly RoomSnapshotRow[],
  onSkip: (sessionKey: string, reason: string) => void = () => {},
): Map<string, GameState> {
  const restored = new Map<string, GameState>()
  for (const row of rows) {
    let parsed: unknown
    try {
      parsed = JSON.parse(row.stateJson)
    } catch {
      onSkip(row.sessionKey, 'not valid JSON')
      continue
    }
    const wrapper = parsed as { v?: unknown; state?: unknown } | null
    if (wrapper?.v !== SNAPSHOT_VERSION) {
      onSkip(row.sessionKey, `unsupported snapshot version ${String(wrapper?.v)}`)
      continue
    }
    if (!isGameStateShape(wrapper.state)) {
      onSkip(row.sessionKey, 'not a game state')
      continue
    }
    restored.set(row.sessionKey, wrapper.state)
  }
  return restored
}

/** Saved venues untouched for longer than this are dropped at boot (12 hours). */
export const DEFAULT_SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000

/** SNAPSHOT_MAX_AGE_HOURS overrides the default; anything that is not a positive number is ignored. */
export function snapshotMaxAgeMs(env: NodeJS.ProcessEnv = process.env): number {
  const hours = Number(env.SNAPSHOT_MAX_AGE_HOURS)
  return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : DEFAULT_SNAPSHOT_MAX_AGE_MS
}

/**
 * Keep a venue's tables together: the venue is as fresh as its most recently changed table,
 * so an idle lobby row never gets dropped while its venue is still in play.
 * Rows with no save time are kept.
 */
export function dropStaleVenues(
  rows: readonly RoomSnapshotRow[],
  nowMs: number,
  maxAgeMs: number,
): { fresh: RoomSnapshotRow[]; droppedVenues: string[] } {
  const newestByVenue = new Map<string, number>()
  for (const row of rows) {
    const venue = row.sessionKey.split(':')[0] ?? ''
    const saved = row.savedAtMs ?? nowMs
    newestByVenue.set(venue, Math.max(newestByVenue.get(venue) ?? 0, saved))
  }
  const stale = new Set<string>()
  for (const [venue, newest] of newestByVenue) if (nowMs - newest > maxAgeMs) stale.add(venue)
  return {
    fresh: rows.filter((r) => !stale.has(r.sessionKey.split(':')[0] ?? '')),
    droppedVenues: [...stale].sort(),
  }
}
