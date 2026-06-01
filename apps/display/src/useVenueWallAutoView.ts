import { useRef } from 'react'
import type { DisplayVenueWallSnapshot, VenueWallViewMode } from '@qhe/net'
import { buildVenueWallTileRows } from './venueWallModel'
import {
  INITIAL_VENUE_WALL_AUTO_VIEW_STATE,
  stepVenueWallAutoView,
} from './venueWallAutoView'

/** Derives floor vs leaderboard from venue phase; null leaves host layout in control. */
export function useVenueWallAutoView(wall: DisplayVenueWallSnapshot | null): VenueWallViewMode | null {
  const stateRef = useRef(INITIAL_VENUE_WALL_AUTO_VIEW_STATE)

  if (wall == null) return null

  const tiles = buildVenueWallTileRows(wall)
  const { state, view } = stepVenueWallAutoView(stateRef.current, tiles, wall.headlinePhase ?? null)
  stateRef.current = state
  return view
}
