import { useEffect, useRef, useState } from 'react'
import type { DisplayVenueSeatingAnnouncement, DisplayVenueWallSnapshot } from '@qhe/net'

const SEATING_OVERLAY_BASE_MS = 4600
const SEATING_OVERLAY_SHUFFLE_MS = 6800
const SEATING_OVERLAY_PER_ROW_MS = 610
const SEATING_OVERLAY_MAX_MS = 10000

export function seatingOverlayDurationMs(
  seating: DisplayVenueSeatingAnnouncement,
  reducedMotion: boolean,
): number {
  if (seating.shuffled) {
    return reducedMotion ? 4300 : SEATING_OVERLAY_SHUFFLE_MS
  }
  const rows = seating.moves.length + seating.closedTableNums.length
  if (rows <= 0) return 0
  if (reducedMotion) return Math.min(SEATING_OVERLAY_MAX_MS, SEATING_OVERLAY_BASE_MS)
  return Math.min(
    SEATING_OVERLAY_MAX_MS,
    SEATING_OVERLAY_BASE_MS + Math.max(0, rows - 1) * SEATING_OVERLAY_PER_ROW_MS,
  )
}

/**
 * Named moves at payout. A global re-seat is not this card: shuffle-only
 * payloads stay quiet, and a re-seat that also rescued someone lists just that player.
 */
export function payoutSeatChangesToAnnounce(
  seating: DisplayVenueSeatingAnnouncement | null | undefined,
): DisplayVenueSeatingAnnouncement | null {
  if (seating == null || seating.moves.length === 0) return null
  return {
    ...seating,
    shuffled: false,
    closedTableNums: seating.shuffled ? [] : seating.closedTableNums,
  }
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
 * Full-screen TV callout after payout when a player changed tables outside a global re-seat.
 * Waits for the elimination overlay to finish when both fire on the same hand.
 */
export function useVenueSeatingAnnouncement(
  wall: DisplayVenueWallSnapshot | null,
  bustOverlayVisible: boolean,
): VenueSeatingAnnouncementState {
  const dismissedHandEndMsRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [shownSeating, setShownSeating] = useState<DisplayVenueSeatingAnnouncement | null>(null)

  const seating = payoutSeatChangesToAnnounce(wall?.lastHandSeating ?? null)
  const handEndMs = wall?.lastHandEndMs ?? null
  const hasContent = venueSeatingAnnouncementHasContent(seating)
  const signature =
    !hasContent || handEndMs == null
      ? ''
      : `${handEndMs}:${seating.moves.map((m) => `${m.name}:${m.fromTableNum}-${m.toTableNum}`).join('|')}:${seating.closedTableNums.join(',')}`

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
  }, [signature, handEndMs, bustOverlayVisible])

  return { visible, seating: shownSeating }
}
