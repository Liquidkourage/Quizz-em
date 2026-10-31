import type { GameState } from '@qhe/core'

/** One saved table: its session key (VENUE:TABLE) and the game state as JSON. */
export interface RoomSnapshotRow {
  sessionKey: string
  stateJson: string
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
