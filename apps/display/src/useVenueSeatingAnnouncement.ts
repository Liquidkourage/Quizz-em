import { useEffect, useRef, useState } from 'react'
import type {
  DisplayVenueBustEntry,
  DisplayVenueSeatingAnnouncement,
  DisplayVenueWallSnapshot,
} from '@qhe/net'

const SEATING_OVERLAY_BASE_MS = 4600
const SEATING_OVERLAY_SHUFFLE_MS = 6800
const SEATING_OVERLAY_PER_ROW_MS = 610
const SEATING_OVERLAY_MAX_MS = 10000

export function seatingOverlayDurationMs(
  seating: DisplayVenueSeatingAnnouncement,
  reducedMotion: boolean,
  bustCount = 0,
): number {
  const busts = Math.max(0, bustCount)
  if (seating.shuffled) {
    const base = reducedMotion ? 4300 : SEATING_OVERLAY_SHUFFLE_MS
    const extra = reducedMotion ? 0 : busts * SEATING_OVERLAY_PER_ROW_MS
    return Math.min(SEATING_OVERLAY_MAX_MS, base + extra)
  }
  const rows = seating.moves.length + seating.closedTableNums.length + busts
  if (rows <= 0) return 0
  if (reducedMotion) return Math.min(SEATING_OVERLAY_MAX_MS, SEATING_OVERLAY_BASE_MS)
  return Math.min(
    SEATING_OVERLAY_MAX_MS,
    SEATING_OVERLAY_BASE_MS + Math.max(0, rows - 1) * SEATING_OVERLAY_PER_ROW_MS,
  )
}

/** Eliminations share the seating card when that hand also moved or closed a table. */
export function payoutBustsShareTheSeatingCard(
  seating: DisplayVenueSeatingAnnouncement | null | undefined,
): boolean {
  return payoutSeatChangesToAnnounce(seating) != null
}

/**
 * Moves and dropped tables after a hand. A redraw with no closed table stays off this card.
 */
export function payoutSeatChangesToAnnounce(
  seating: DisplayVenueSeatingAnnouncement | null | undefined,
): DisplayVenueSeatingAnnouncement | null {
  if (seating == null) return null
  if (seating.moves.length === 0 && seating.closedTableNums.length === 0) return null
  return seating
}

function seatingMoveFromWire(raw: unknown): DisplayVenueSeatingAnnouncement['moves'][number] | null {
  if (raw == null || typeof raw !== 'object') return null
  const row = raw as Partial<DisplayVenueSeatingAnnouncement['moves'][number]>
  if (typeof row.name !== 'string' || typeof row.fromTableNum !== 'number' || typeof row.toTableNum !== 'number') {
    return null
  }
  const byline = typeof row.byline === 'string' ? row.byline.trim() : ''
  return {
    name: row.name.trim(),
    fromTableNum: Math.floor(row.fromTableNum),
    toTableNum: Math.floor(row.toTableNum),
    ...(byline ? { byline } : {}),
  }
}

function wholeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0
}

function closedTablesFromWire(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).map((n) => Math.floor(n))
}

export function normalizeLastHandSeating(raw: unknown): DisplayVenueSeatingAnnouncement | null {
  if (raw == null || typeof raw !== 'object') return null
  const s = raw as Partial<DisplayVenueSeatingAnnouncement>
  const moves = Array.isArray(s.moves)
    ? s.moves
        .map(seatingMoveFromWire)
        .filter((m): m is DisplayVenueSeatingAnnouncement['moves'][number] => m != null)
    : []
  const out: DisplayVenueSeatingAnnouncement = {
    moves,
    closedTableNums: closedTablesFromWire(s.closedTableNums),
    shuffled: s.shuffled === true,
    tablesBefore: wholeNumber(s.tablesBefore),
    tablesAfter: wholeNumber(s.tablesAfter),
    playerCount: wholeNumber(s.playerCount),
  }
  return venueSeatingAnnouncementHasContent(out) ? out : null
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
  busts: DisplayVenueBustEntry[]
}

/**
 * One TV card after payout for table moves and, on that same hand, eliminations.
 */
export function useVenueSeatingAnnouncement(
  wall: DisplayVenueWallSnapshot | null,
): VenueSeatingAnnouncementState {
  const dismissedHandEndMsRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [shownSeating, setShownSeating] = useState<DisplayVenueSeatingAnnouncement | null>(null)
  const [shownBusts, setShownBusts] = useState<DisplayVenueBustEntry[]>([])

  const seating = payoutSeatChangesToAnnounce(wall?.lastHandSeating ?? null)
  const busts = wall?.lastHandBusts ?? []
  const handEndMs = wall?.lastHandEndMs ?? null
  const hasContent = venueSeatingAnnouncementHasContent(seating)
  const signature =
    !hasContent || handEndMs == null
      ? ''
      : `${handEndMs}:${seating.moves.map((m) => `${m.name}:${m.fromTableNum}-${m.toTableNum}`).join('|')}:${seating.closedTableNums.join(',')}:${busts.map((b) => `${b.name}@${b.tableNum}`).join('|')}`

  useEffect(() => {
    if (wall == null || !hasContent || handEndMs == null) {
      setVisible(false)
      return
    }
    if (dismissedHandEndMsRef.current === handEndMs) {
      setVisible(false)
      return
    }

    setShownSeating(seating)
    setShownBusts(busts)
    setVisible(true)

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const timer = window.setTimeout(() => {
      dismissedHandEndMsRef.current = handEndMs
      setVisible(false)
    }, seatingOverlayDurationMs(seating, reducedMotion, busts.length))

    return () => window.clearTimeout(timer)
  }, [signature, handEndMs])

  return { visible, seating: shownSeating, busts: shownBusts }
}
