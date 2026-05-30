import {
  DISPLAY_PREVIEW_BANKROLLS,
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_TABLES,
  VENUE_WALL_SEAT_SLOTS,
  displayBlindSeatIndices,
  rehearsalSeatDisplayName,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'

export { VENUE_WALL_SEAT_SLOTS }

/** During venue-wide showdown, rotate the hero felt so each table gets the full overlay. */
export const SHOWDOWN_SPOTLIGHT_CYCLE_SEC = 14

export function buildVenueWallTileRows(wall: DisplayVenueWallSnapshot | null): DisplayVenueTileSnapshot[] {
  if (wall?.tiles != null && wall.tiles.length > 0) {
    return [...wall.tiles].sort((a, b) => a.tableNum - b.tableNum)
  }
  if (wall?.tiles != null && wall.tiles.length === 0) {
    return []
  }
  return DISPLAY_PREVIEW_TABLES.map((snap, i) => {
    const seated = snap.seated
    const base = i * VENUE_WALL_SEAT_SLOTS
    const seatNames = Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, j) =>
      j < seated ? rehearsalSeatDisplayName(base + j) : ''
    )
    const seatBankrolls = Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, j) =>
      j < seated ? DISPLAY_PREVIEW_BANKROLLS[j % DISPLAY_PREVIEW_BANKROLLS.length]! : 0
    )
    return {
      tableNum: i + 1,
      seated,
      pot: snap.pot,
      phase: DISPLAY_PREVIEW_SYNCED_PHASE,
      seatNames,
      seatBankrolls,
      ...displayBlindSeatIndices(seated, i % Math.max(seated, 1)),
    }
  })
}

/** Hero follows lowest tableNum among the hottest phase bucket when no host pin. */
export function floorFeaturedTileIndex(tileRows: DisplayVenueTileSnapshot[]): number {
  if (tileRows.length === 0) return 0
  const rank: Record<string, number> = {
    betting: 0,
    answering: 1,
    question: 2,
    showdown: 3,
    reveal: 4,
    payout: 5,
    intermission: 6,
    lobby: 99,
  }
  let bestI = 0
  let bestRank = 999
  let bestTn = 999
  for (let i = 0; i < tileRows.length; i++) {
    const t = tileRows[i]!
    const r = rank[t.phase] ?? 50
    if (r < bestRank || (r === bestRank && t.tableNum < bestTn)) {
      bestRank = r
      bestTn = t.tableNum
      bestI = i
    }
  }
  return bestI
}

export function venueWallHasLiveTiles(wall: DisplayVenueWallSnapshot | null): boolean {
  return wall != null && wall.tiles != null && wall.tiles.length > 0
}

export function showdownTableNums(tileRows: DisplayVenueTileSnapshot[]): number[] {
  return tileRows.filter((t) => t.phase === 'showdown').map((t) => t.tableNum)
}

/** Human label for venue-wall headline phase chips. */
export function venueWallPhaseLabel(ph: string): string {
  if (ph === 'lobby') return 'Lobby'
  if (ph === 'question') return 'Question setup'
  if (ph === 'betting') return 'Wagering'
  if (ph === 'answering') return 'Answering'
  if (ph === 'reveal') return 'Reveal'
  if (ph === 'showdown') return 'Showdown'
  if (ph === 'payout') return 'Payout'
  if (ph === 'intermission') return 'Break'
  return ph
}

/** Which numbered felt drives the sticky headline strip (server field with tile fallback). */
export function resolveVenueHeadlineSource(
  wall: DisplayVenueWallSnapshot | null,
  tileRows: DisplayVenueTileSnapshot[]
): { tableNum: number | null; phase: string | null } {
  if (
    wall?.headlineTableNum != null &&
    typeof wall.headlineTableNum === 'number' &&
    Number.isFinite(wall.headlineTableNum)
  ) {
    return {
      tableNum: Math.floor(wall.headlineTableNum),
      phase: typeof wall.headlinePhase === 'string' ? wall.headlinePhase : null,
    }
  }
  const answering = tileRows.find((t) => t.phase === 'answering' && t.seated >= 2)
  if (answering) return { tableNum: answering.tableNum, phase: 'answering' }
  const idx = floorFeaturedTileIndex(tileRows)
  const t = tileRows[idx]
  return t != null ? { tableNum: t.tableNum, phase: t.phase } : { tableNum: null, phase: null }
}

/** Secondary headline note when populated felts are on different steps. */
export function venueHeadlineDivergenceNote(
  tileRows: DisplayVenueTileSnapshot[],
  headlinePhase: string | null
): string | null {
  if (headlinePhase == null) return null
  const active = tileRows.filter((t) => t.seated >= 2)
  if (active.length <= 1) return null

  if (headlinePhase === 'answering') {
    const wagering = active.filter((t) => t.phase === 'betting' && t.isBettingOpen === true).length
    if (wagering > 0) return `${wagering} table${wagering === 1 ? '' : 's'} still wagering`
  }
  if (headlinePhase === 'betting') {
    const answering = active.filter((t) => t.phase === 'answering').length
    if (answering > 0) return `${answering} table${answering === 1 ? '' : 's'} answering`
  }
  return null
}

/** Legacy full-screen grid — mosaic tile overlays are production. */
export function shouldUseVenueShowdownWall(_tileRows: DisplayVenueTileSnapshot[]): boolean {
  return false
}

/** Multiple felts in showdown with no host pin — cycle hero so TV shows each full overlay. */
export function shouldRotateShowdownTour(
  tileRows: DisplayVenueTileSnapshot[],
  hostFocusTable: number | null
): boolean {
  if (hostFocusTable != null) return false
  if (shouldUseVenueShowdownWall(tileRows)) return false
  return showdownTableNums(tileRows).length > 1
}
