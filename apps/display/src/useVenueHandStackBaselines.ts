import { useRef } from 'react'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { captureVenueHandStackBaselines } from './venueLeaderboard'
import { venueHandIsStarting } from './venueWallAutoView'

/** Snapshots stacks when a new question/hand opens; used for last-hand ▲/▼ on the leaderboard. */
export function useVenueHandStackBaselines(
  tiles: DisplayVenueTileSnapshot[],
  headlinePhase: string | null | undefined
): ReadonlyMap<string, number> {
  const baselinesRef = useRef<Map<string, number>>(new Map())
  const prevHandStartingRef = useRef(false)

  const handStarting = venueHandIsStarting(tiles, headlinePhase)
  if (handStarting && !prevHandStartingRef.current) {
    baselinesRef.current = captureVenueHandStackBaselines(tiles)
  }
  prevHandStartingRef.current = handStarting

  return baselinesRef.current
}
