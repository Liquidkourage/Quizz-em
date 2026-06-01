import type { DisplayVenueTileSnapshot, VenueWallViewMode } from '@qhe/net'

export type VenueWallAutoViewState = {
  latchedLeaderboard: boolean
  sawPostHandPhase: boolean
}

const LIVE_FLOOR_PHASES = new Set<string>([
  'question',
  'betting',
  'answering',
  'reveal',
  'showdown',
  'payout',
])

const POST_HAND_PHASES = new Set<string>(['showdown', 'reveal', 'payout'])

export function venueHandIsStarting(
  tiles: DisplayVenueTileSnapshot[],
  headlinePhase: string | null | undefined
): boolean {
  if (headlinePhase === 'question' || headlinePhase === 'betting') return true
  return tiles.some((t) => t.phase === 'question' || t.phase === 'betting')
}

export function venueWallLiveFloorActive(
  tiles: DisplayVenueTileSnapshot[],
  headlinePhase: string | null | undefined
): boolean {
  if (headlinePhase != null && LIVE_FLOOR_PHASES.has(headlinePhase)) return true
  return tiles.some((t) => LIVE_FLOOR_PHASES.has(t.phase))
}

function venueWallAllLobby(tiles: DisplayVenueTileSnapshot[]): boolean {
  return tiles.length > 0 && tiles.every((t) => t.phase === 'lobby')
}

function venueWallAnyPostHand(tiles: DisplayVenueTileSnapshot[]): boolean {
  return tiles.some((t) => POST_HAND_PHASES.has(t.phase))
}

export const INITIAL_VENUE_WALL_AUTO_VIEW_STATE: VenueWallAutoViewState = {
  latchedLeaderboard: false,
  sawPostHandPhase: false,
}

/**
 * After payouts (showdown → lobby), latch leaderboard until the next question opens.
 * During an active hand, always prefer the floor mosaic.
 */
export function stepVenueWallAutoView(
  prev: VenueWallAutoViewState,
  tiles: DisplayVenueTileSnapshot[],
  headlinePhase: string | null | undefined
): { state: VenueWallAutoViewState; view: VenueWallViewMode | null } {
  let latchedLeaderboard = prev.latchedLeaderboard
  let sawPostHandPhase = prev.sawPostHandPhase

  if (venueWallAnyPostHand(tiles)) {
    sawPostHandPhase = true
  }

  if (sawPostHandPhase && venueWallAllLobby(tiles)) {
    latchedLeaderboard = true
    sawPostHandPhase = false
  }

  if (venueHandIsStarting(tiles, headlinePhase)) {
    latchedLeaderboard = false
  }

  const state = { latchedLeaderboard, sawPostHandPhase }

  if (venueWallLiveFloorActive(tiles, headlinePhase)) {
    return { state, view: 'floor' }
  }

  if (latchedLeaderboard && venueWallAllLobby(tiles)) {
    return { state, view: 'leaderboard' }
  }

  return { state, view: null }
}
