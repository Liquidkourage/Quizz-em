import { useEffect, useState } from 'react'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { postHandBeatsActive, POST_HAND_TOTAL_MS } from './postHandBeats'
import { nowOnServerClock } from './serverClock'

/** Re-renders while a post-hand beat window is open so overlays / auto-view stay in sync. */
export function usePostHandBeatClock(wall: DisplayVenueWallSnapshot | null): number {
  const [, setTick] = useState(0)
  const started = wall?.postHandBeatStartedAtMs ?? null

  useEffect(() => {
    if (started == null || !Number.isFinite(started)) return
    if (!postHandBeatsActive(started, nowOnServerClock())) return
    const id = window.setInterval(() => setTick((n) => n + 1), 250)
    const endAt = started + POST_HAND_TOTAL_MS
    const remaining = Math.max(0, endAt - nowOnServerClock())
    const stop = window.setTimeout(() => setTick((n) => n + 1), remaining + 50)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(stop)
    }
  }, [started])

  return nowOnServerClock()
}
