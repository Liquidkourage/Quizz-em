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

export const INITIAL_VENUE_WALL_AUTO_VIEW_STATE: VenueWallAutoViewState = {
  latchedLeaderboard: false,
  sawPostHandPhase: false,
}

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

/** True once any felt (or the shared headline) has left lobby — exits the join hero on all displays. */
export function venueWallFloorIsLive(
  tiles: DisplayVenueTileSnapshot[],
  headlinePhase: string | null | undefined,
): boolean {
  return venueWallLiveFloorActive(tiles, headlinePhase)
}

/**
 * During a hand, the tables stay up. After payout the screen stays put until the host chooses one.
 */
export function stepVenueWallAutoView(
  _prev: VenueWallAutoViewState,
  tiles: DisplayVenueTileSnapshot[],
  headlinePhase: string | null | undefined,
): { state: VenueWallAutoViewState; view: VenueWallViewMode | null } {
  const state: VenueWallAutoViewState = { latchedLeaderboard: false, sawPostHandPhase: false }
  if (venueWallLiveFloorActive(tiles, headlinePhase)) {
    return { state, view: 'floor' }
  }
  return { state, view: null }
}

/** Host asked the TVs to leave the table floor. */
export function hostPinnedAudienceView(hostWallView: VenueWallViewMode | undefined): boolean {
  return (
    hostWallView === 'rules' ||
    hostWallView === 'leaderboard' ||
    hostWallView === 'leaderboard-trivia' ||
    hostWallView === 'seating-chart' ||
    hostWallView === 'busts'
  )
}

/**
 * Chip scores, trivia scores, seating, eliminations, and how-to-play stay up when the host selects them.
 * Tables follows the hand. After payout the tables stay until the host picks another screen.
 */
export function resolveAudienceWallView(
  hostWallView: VenueWallViewMode | undefined,
  autoWallView: VenueWallViewMode | null,
): VenueWallViewMode {
  const host = hostWallView ?? 'floor'
  if (hostPinnedAudienceView(host)) return host
  return autoWallView ?? host
}
