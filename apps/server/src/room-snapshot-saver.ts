import type { GameState } from '@qhe/core'
import { toSnapshotRows } from './room-snapshot'
import type { RoomSnapshotStore } from './room-snapshot-store'

export interface RoomSnapshotSaver {
  /** Save now if anything changed since the last successful save. */
  flush(): Promise<void>
  stop(): void
}

/**
 * Saves the rooms map on a timer. Writes only when a table changed, never overlaps two
 * saves, and never throws: a failed save is logged and tried again on the next tick.
 */
export function startRoomSnapshotSaver(opts: {
  rooms: ReadonlyMap<string, GameState>
  store: RoomSnapshotStore
  intervalMs?: number
  log?: (message: string, error?: unknown) => void
}): RoomSnapshotSaver {
  const log = opts.log ?? ((message, error) => console.error(message, error))
  let lastSaved = ''
  let saving = false

  async function flush(): Promise<void> {
    if (saving) return
    saving = true
    try {
      const rows = toSnapshotRows(opts.rooms)
      const fingerprint = JSON.stringify(rows)
      if (fingerprint === lastSaved) return
      await opts.store.replaceAll(rows)
      lastSaved = fingerprint
    } catch (error) {
      log('[snapshot] save failed, will retry', error)
    } finally {
      saving = false
    }
  }

  const timer = setInterval(() => void flush(), opts.intervalMs ?? 5000)
  timer.unref?.()

  return { flush, stop: () => clearInterval(timer) }
}
