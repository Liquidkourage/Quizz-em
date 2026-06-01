import {
  DISPLAY_PREVIEW_BANKROLLS,
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_TABLES,
  VENUE_WALL_SEAT_SLOTS,
  displayBlindSeatIndices,
  listVenueCondenseMilestones,
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

export function venueHasOpenWagering(tileRows: DisplayVenueTileSnapshot[]): boolean {
  return tileRows.some((t) => t.seated >= 2 && t.phase === 'betting' && t.isBettingOpen === true)
}

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

/** Sticky headline strip: venue-wide blind amounts + level schedule. */
export function venueWallBlindsLine(wall: DisplayVenueWallSnapshot | null): string | null {
  const parts = venueWallBlindsHeadline(wall)
  if (parts == null) return null
  return parts.meta != null ? `Blinds ${parts.amount} · ${parts.meta}` : `Blinds ${parts.amount}`
}

/** Right-rail headline chip: amount + optional level meta (matches timer / answer column). */
export function venueWallBlindsHeadline(
  wall: DisplayVenueWallSnapshot | null,
): { amount: string; meta: string | null } | null {
  if (wall == null) return null
  const sb = wall.venueSmallBlind
  const bb = wall.venueBigBlind
  if (sb == null || bb == null || !Number.isFinite(sb) || !Number.isFinite(bb)) return null
  const amount = `$${Math.floor(sb)} / $${Math.floor(bb)}`
  const metaParts: string[] = []
  if (
    wall.blindLevelNumber != null &&
    wall.blindLevelCount != null &&
    Number.isFinite(wall.blindLevelNumber) &&
    Number.isFinite(wall.blindLevelCount)
  ) {
    metaParts.push(`Level ${Math.floor(wall.blindLevelNumber)}/${Math.floor(wall.blindLevelCount)}`)
  }
  if (wall.handsUntilNextBlindLevel != null && Number.isFinite(wall.handsUntilNextBlindLevel)) {
    metaParts.push(`${Math.floor(wall.handsUntilNextBlindLevel)} hand(s) to next level`)
  }
  return { amount, meta: metaParts.length > 0 ? metaParts.join(' · ') : null }
}

export type VenueCondenseHeadline = {
  survivors: number
  liveTables: number
  nextAt: number | null
  targetTables: number | null
  /** Primary audience line for the TV strip. */
  primary: string
  /** Secondary detail line. */
  secondary: string | null
}

/** Audience-facing table-combine forecast for the venue wall header. */
export function venueWallCondenseHeadline(wall: DisplayVenueWallSnapshot | null): VenueCondenseHeadline | null {
  if (wall == null) return null
  const survivors =
    typeof wall.venueChipSurvivorCount === 'number' && Number.isFinite(wall.venueChipSurvivorCount)
      ? Math.floor(wall.venueChipSurvivorCount)
      : typeof wall.totalSeatedAtTables === 'number' && Number.isFinite(wall.totalSeatedAtTables)
        ? Math.floor(wall.totalSeatedAtTables)
        : null
  const liveTables =
    typeof wall.venueLiveTableCount === 'number' && Number.isFinite(wall.venueLiveTableCount)
      ? Math.floor(wall.venueLiveTableCount)
      : null
  if (survivors == null || liveTables == null || liveTables <= 0) return null

  const nextAt =
    typeof wall.venueNextCondenseAtSurvivors === 'number' &&
    Number.isFinite(wall.venueNextCondenseAtSurvivors)
      ? Math.floor(wall.venueNextCondenseAtSurvivors)
      : null
  const targetTables =
    typeof wall.venueTargetTablesAfterCondense === 'number' &&
    Number.isFinite(wall.venueTargetTablesAfterCondense)
      ? Math.floor(wall.venueTargetTablesAfterCondense)
      : null

  if (liveTables <= 1) {
    return {
      survivors,
      liveTables,
      nextAt: null,
      targetTables: null,
      primary: survivors <= 8 ? 'Final table' : `${survivors} players remain`,
      secondary: null,
    }
  }

  if (nextAt == null) {
    return {
      survivors,
      liveTables,
      nextAt: null,
      targetTables: null,
      primary: `${liveTables} tables · ${survivors} players`,
      secondary: null,
    }
  }

  if (survivors <= nextAt) {
    const to = targetTables ?? liveTables - 2
    return {
      survivors,
      liveTables,
      nextAt,
      targetTables: targetTables,
      primary: `Combining to ${to} tables now`,
      secondary: `${survivors} players remaining`,
    }
  }

  return {
    survivors,
    liveTables,
    nextAt,
    targetTables,
    primary: `Next combine at ${nextAt} players`,
    secondary:
      targetTables != null
        ? `${liveTables} tables now → ${targetTables} tables`
        : `${liveTables} tables · ${survivors} players remaining`,
  }
}

export type VenueCondenseProgressMark = {
  atSurvivors: number
  toTables: number
  /** 0–100 from left (full field) to right (final). */
  pct: number
  status: 'passed' | 'next' | 'upcoming'
}

export type VenueCondenseProgressModel = {
  survivors: number
  peakSurvivors: number
  liveTables: number
  fillPct: number
  marks: VenueCondenseProgressMark[]
  nextAt: number | null
  nextToTables: number | null
}

function survivorTrackPct(survivors: number, peakSurvivors: number): number {
  if (peakSurvivors <= 0) return 0
  if (peakSurvivors <= 1) return survivors >= 1 ? 100 : 0
  const clamped = Math.max(0, Math.min(peakSurvivors, survivors))
  return (clamped / peakSurvivors) * 100
}

/** Thermometer progress model for the venue condense strip. */
export function buildVenueCondenseProgress(args: {
  wall: DisplayVenueWallSnapshot | null
  peakSurvivors: number
}): VenueCondenseProgressModel | null {
  const headline = venueWallCondenseHeadline(args.wall)
  if (headline == null) return null

  const peakSurvivors = Math.max(args.peakSurvivors, headline.survivors, 1)
  const { survivors, liveTables, nextAt, targetTables } = headline

  if (liveTables <= 1) {
    return {
      survivors,
      peakSurvivors,
      liveTables,
      fillPct: survivorTrackPct(survivors, peakSurvivors),
      marks: [],
      nextAt: null,
      nextToTables: null,
    }
  }

  const milestones = listVenueCondenseMilestones(liveTables, peakSurvivors)
  const marks: VenueCondenseProgressMark[] = milestones.map((m) => {
    let status: VenueCondenseProgressMark['status'] = 'upcoming'
    if (nextAt != null && m.atSurvivors === nextAt) {
      status = survivors <= nextAt ? 'next' : 'upcoming'
    } else if (survivors < m.atSurvivors) {
      status = 'passed'
    }
    return {
      atSurvivors: m.atSurvivors,
      toTables: m.toTables,
      pct: survivorTrackPct(m.atSurvivors, peakSurvivors),
      status,
    }
  })

  return {
    survivors,
    peakSurvivors,
    liveTables,
    fillPct: survivorTrackPct(survivors, peakSurvivors),
    marks,
    nextAt,
    nextToTables: targetTables,
  }
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

export type VenueSeatingChartTable = {
  tableNum: number
  seats: { seatNum: number; name: string; bankroll: number }[]
}

/** Tables with at least one seated name, sorted by table number. */
export function seatingChartTablesFromTiles(
  tileRows: DisplayVenueTileSnapshot[]
): VenueSeatingChartTable[] {
  const out: VenueSeatingChartTable[] = []
  for (const t of tileRows) {
    if (t.seated <= 0) continue
    const seats: VenueSeatingChartTable['seats'] = []
    for (let i = 0; i < VENUE_WALL_SEAT_SLOTS; i++) {
      const name = t.seatNames[i]?.trim() ?? ''
      if (!name) continue
      const bankroll = t.seatBankrolls?.[i]
      seats.push({
        seatNum: i + 1,
        name,
        bankroll: typeof bankroll === 'number' && Number.isFinite(bankroll) ? bankroll : 0,
      })
    }
    if (seats.length === 0) continue
    out.push({ tableNum: t.tableNum, seats })
  }
  out.sort((a, b) => a.tableNum - b.tableNum)
  return out
}

/**
 * Post–assign-from-lobby, pre–start-round: everyone is seated but every felt is still `lobby`.
 * Replaces the empty mosaic + spotlight until the host starts the round.
 */
export function venueWallShowSeatingChart(
  wall: DisplayVenueWallSnapshot | null,
  tileRows: DisplayVenueTileSnapshot[]
): boolean {
  if (!venueWallHasLiveTiles(wall)) return false
  if (wall!.showAudienceWelcome !== false) return false
  if (tileRows.length === 0) return false
  if (!tileRows.every((t) => t.phase === 'lobby')) return false
  return seatingChartTablesFromTiles(tileRows).length > 0
}
