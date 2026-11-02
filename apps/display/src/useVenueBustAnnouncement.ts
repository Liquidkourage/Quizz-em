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

/** True when the hand that just paid eliminated at least one player. */
export function handHasPayoutBusts(
  wall: { lastHandBusts?: DisplayVenueBustEntry[] | null; lastHandEndMs?: number | null } | null,
): boolean {
  if (wall == null || wall.lastHandEndMs == null) return false
  return (wall.lastHandBusts?.length ?? 0) > 0
}

/**
 * Full-screen callout when winners are paid and someone is eliminated.
 * Each hand (`lastHandEndMs`) shows at most once per display tab.
 */
export function useVenueBustAnnouncement(
  wall: DisplayVenueWallSnapshot | null,
): VenueBustAnnouncementState {
  const dismissedHandEndMsRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [shownBusts, setShownBusts] = useState<DisplayVenueBustEntry[]>([])

  const busts = wall?.lastHandBusts ?? []
  const handEndMs = wall?.lastHandEndMs ?? null
  const signature =
    handEndMs == null || busts.length === 0
      ? ''
      : `${handEndMs}:${busts.map((b) => `${b.name}@${b.tableNum}`).join('|')}`

  useEffect(() => {
    if (!handHasPayoutBusts(wall) || handEndMs == null) {
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
  }, [signature, handEndMs])

  return { visible, busts: shownBusts }
}
