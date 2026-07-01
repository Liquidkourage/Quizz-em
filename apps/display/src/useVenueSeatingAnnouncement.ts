import { useEffect, useRef, useState } from 'react'
import type { DisplayVenueSeatingAnnouncement, DisplayVenueWallSnapshot } from '@qhe/net'

const SEATING_OVERLAY_BASE_MS = 6500
const SEATING_OVERLAY_SHUFFLE_MS = 9500
const SEATING_OVERLAY_PER_ROW_MS = 850
const SEATING_OVERLAY_MAX_MS = 14000

function seatingOverlayDurationMs(
  seating: DisplayVenueSeatingAnnouncement,
  reducedMotion: boolean,
): number {
  if (seating.shuffled) {
    return reducedMotion ? 6000 : SEATING_OVERLAY_SHUFFLE_MS
  }
  const rows = seating.moves.length + seating.closedTableNums.length
  if (rows <= 0) return 0
  if (reducedMotion) return Math.min(SEATING_OVERLAY_MAX_MS, SEATING_OVERLAY_BASE_MS)
  return Math.min(
    SEATING_OVERLAY_MAX_MS,
    SEATING_OVERLAY_BASE_MS + Math.max(0, rows - 1) * SEATING_OVERLAY_PER_ROW_MS,
  )
}

export function venueSeatingAnnouncementHasContent(
  seating: DisplayVenueSeatingAnnouncement | null | undefined,
): seating is DisplayVenueSeatingAnnouncement {
  if (seating == null) return false
  return seating.shuffled || seating.moves.length > 0 || seating.closedTableNums.length > 0
}

export type VenueSeatingAnnouncementState = {
  visible: boolean
  seating: DisplayVenueSeatingAnnouncement | null
}

/**
 * Full-screen TV callout after End Round when players move tables or felts close.
 * Waits for the bust overlay to finish when both fire on the same hand.
 */
export function useVenueSeatingAnnouncement(
  wall: DisplayVenueWallSnapshot | null,
  bustOverlayVisible: boolean,
): VenueSeatingAnnouncementState {
  const dismissedHandEndMsRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [shownSeating, setShownSeating] = useState<DisplayVenueSeatingAnnouncement | null>(null)

  const seating = wall?.lastHandSeating ?? null
  const handEndMs = wall?.lastHandEndMs ?? null
  const hasContent = venueSeatingAnnouncementHasContent(seating)

  useEffect(() => {
    if (wall == null || !hasContent || handEndMs == null) {
      setVisible(false)
      return
    }
    if (bustOverlayVisible) {
      setVisible(false)
      return
    }
    if (dismissedHandEndMsRef.current === handEndMs) {
      setVisible(false)
      return
    }

    setShownSeating(seating)
    setVisible(true)

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const timer = window.setTimeout(() => {
      dismissedHandEndMsRef.current = handEndMs
      setVisible(false)
    }, seatingOverlayDurationMs(seating, reducedMotion))

    return () => window.clearTimeout(timer)
  }, [wall, hasContent, handEndMs, bustOverlayVisible, seating])

  return { visible, seating: shownSeating }
}
