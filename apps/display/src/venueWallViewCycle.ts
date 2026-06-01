import { venueTileActingSeatIndex, VENUE_WALL_SEAT_SLOTS } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { venueHasOpenWagering } from './venueWallModel'

export type VenueWallViewId = 'floor' | 'actionTicker' | 'heroSpotlight' | 'showdownSpotlight'

export const VENUE_WALL_VIEW_DWELL_MS = 12_000

export const VENUE_WALL_VIEW_LABELS: Record<VenueWallViewId, string> = {
  floor: 'Floor overview',
  actionTicker: 'Action rail',
  heroSpotlight: 'Table spotlight',
  showdownSpotlight: 'Showdown spotlight',
}

export type VenueWallViewPlaylist = {
  key: string
  views: VenueWallViewId[]
  dwellMs: number
  locked: boolean
}

function formatVenueBankroll(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
}

function padSeatNames(raw: string[] | undefined): string[] {
  return Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, i) => {
    if (raw != null && raw[i] != null) {
      return String(raw[i]).trim()
    }
    return ''
  })
}

/** One line for the scrolling action rail — null when this table has nothing to show. */
export function venueActionTickerLine(row: DisplayVenueTileSnapshot): string | null {
  if (row.seated < 2 || row.phase !== 'betting' || row.isBettingOpen !== true) return null
  const seat = venueTileActingSeatIndex(row)
  if (seat == null || seat < 0 || seat >= VENUE_WALL_SEAT_SLOTS) return null
  if (row.actingCallAmount == null || typeof row.actingCallAmount !== 'number') return null
  const seatNames = padSeatNames(row.seatNames)
  const raw = seatNames[seat]?.trim() ?? ''
  const name = raw || `Seat ${seat + 1}`
  return `Table ${row.tableNum} · ${name} to call: ${formatVenueBankroll(row.actingCallAmount)}`
}

export function venueActionTickerLines(tileRows: DisplayVenueTileSnapshot[]): string[] {
  return tileRows
    .map(venueActionTickerLine)
    .filter((line): line is string => line != null)
}

export function venueTablesWithOpenAction(tileRows: DisplayVenueTileSnapshot[]): number {
  return tileRows.filter((row) => venueActionTickerLine(row) != null).length
}

export function buildVenueWallViewPlaylist(input: {
  tileRows: DisplayVenueTileSnapshot[]
  hostFocusTable: number | null
  showShowdownTour: boolean
  headlineAnswering: boolean
  answerDeadlineMs: number | null
}): VenueWallViewPlaylist {
  const { tileRows, hostFocusTable, showShowdownTour, headlineAnswering, answerDeadlineMs } = input
  const populated = tileRows.filter((t) => t.seated > 0)
  const tableCount = populated.length
  const openWagering = venueHasOpenWagering(tileRows)
  const dwellMs = VENUE_WALL_VIEW_DWELL_MS

  if (tableCount === 0) {
    return { key: 'empty', views: ['floor'], dwellMs, locked: true }
  }

  if (hostFocusTable != null && hostFocusTable >= 1) {
    return {
      key: `pin-${hostFocusTable}`,
      views: ['heroSpotlight'],
      dwellMs,
      locked: true,
    }
  }

  if (showShowdownTour) {
    if (tableCount > 4) {
      return {
        key: `showdown-mix-${tableCount}`,
        views: ['floor', 'showdownSpotlight'],
        dwellMs,
        locked: false,
      }
    }
    return {
      key: `showdown-hero-${tableCount}`,
      views: ['showdownSpotlight'],
      dwellMs,
      locked: false,
    }
  }

  if (headlineAnswering && answerDeadlineMs != null && tableCount >= 6) {
    return {
      key: 'answering-countdown',
      views: ['floor', 'heroSpotlight'],
      dwellMs,
      locked: false,
    }
  }

  if (openWagering && tableCount >= 6) {
    return {
      key: `wagering-${tableCount}`,
      views: ['floor', 'heroSpotlight'],
      dwellMs,
      locked: false,
    }
  }

  return {
    key: `floor-only-${tableCount}`,
    views: ['floor'],
    dwellMs,
    locked: true,
  }
}
