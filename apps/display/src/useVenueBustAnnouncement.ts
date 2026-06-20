import { useEffect, useRef, useState } from 'react'
import type { DisplayVenueBustEntry, DisplayVenueWallSnapshot } from '@qhe/net'

/** Room-readable dwell before the stacks leaderboard. */
const BUST_OVERLAY_BASE_MS = 6500
const BUST_OVERLAY_PER_PLAYER_MS = 900
const BUST_OVERLAY_MAX_MS = 14000

function bustOverlayDurationMs(bustCount: number, reducedMotion: boolean): number {
  if (bustCount <= 0) return 0
  if (reducedMotion) return Math.min(BUST_OVERLAY_MAX_MS, BUST_OVERLAY_BASE_MS)
  const scaled = BUST_OVERLAY_BASE_MS + Math.max(0, bustCount - 1) * BUST_OVERLAY_PER_PLAYER_MS
  return Math.min(BUST_OVERLAY_MAX_MS, scaled)
}

export type VenueBustAnnouncementState = {
  visible: boolean
  busts: DisplayVenueBustEntry[]
}

/**
 * When the venue auto-rotates to the leaderboard after a hand, pause on a bust callout first.
 * Each hand (`lastHandEndMs`) shows at most once per display tab.
 */
export function useVenueBustAnnouncement(
  wall: DisplayVenueWallSnapshot | null,
  leaderboardPending: boolean,
): VenueBustAnnouncementState {
  const dismissedHandEndMsRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [shownBusts, setShownBusts] = useState<DisplayVenueBustEntry[]>([])

  const busts = wall?.lastHandBusts ?? []
  const handEndMs = wall?.lastHandEndMs ?? null

  useEffect(() => {
    if (!leaderboardPending || wall == null) {
      setVisible(false)
      return
    }
    if (busts.length === 0 || handEndMs == null) {
      setVisible(false)
      return
    }
    if (dismissedHandEndMsRef.current === handEndMs) {
      setVisible(false)
      return
    }

    setShownBusts(busts)
    setVisible(true)

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const timer = window.setTimeout(() => {
      dismissedHandEndMsRef.current = handEndMs
      setVisible(false)
    }, bustOverlayDurationMs(busts.length, reducedMotion))

    return () => window.clearTimeout(timer)
    // busts content is keyed by handEndMs from the server snapshot
  }, [leaderboardPending, handEndMs, busts.length, wall])

  return { visible, busts: shownBusts }
}
