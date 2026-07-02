import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  venueHeadlineCondenseCaptionParts,
  type VenueCondenseProgressModel,
} from './venueWallModel'
import {
  buildVenueFloorHeadlineMeta,
  isBroadcastVenueFloorSpec,
  resolveVenueFloorSpec,
} from './venueFloorSpec'

/** Populated felts that use sports-bar broadcast (not mosaic floor). */
export const VENUE_BROADCAST_TABLE_MAX = 2

export function isVenueBroadcastFloor(
  populatedTableCount: number,
  hostFocusTable: number | null
): boolean {
  return isBroadcastVenueFloorSpec(
    resolveVenueFloorSpec({ populatedTableCount, hostFocusTable })
  )
}

export function isVenueSingleTableBroadcast(
  populatedTableCount: number,
  hostFocusTable: number | null
): boolean {
  const spec = resolveVenueFloorSpec({ populatedTableCount, hostFocusTable })
  return spec?.id === 'broadcast-1' && spec.renderer === 'broadcast'
}

export function isVenueDualTableBroadcast(
  populatedTableCount: number,
  hostFocusTable: number | null
): boolean {
  const spec = resolveVenueFloorSpec({ populatedTableCount, hostFocusTable })
  return spec?.id === 'broadcast-2' && spec.renderer === 'broadcast'
}

export function buildVenueBroadcastMetaLine(
  floorTiles: readonly DisplayVenueTileSnapshot[],
  condenseProgress: VenueCondenseProgressModel | null,
  opts?: { hostFocusTable?: number | null }
): string | null {
  const spec = resolveVenueFloorSpec({
    populatedTableCount: floorTiles.length,
    hostFocusTable: opts?.hostFocusTable ?? null,
  })
  if (spec == null) return null
  return buildVenueFloorHeadlineMeta(spec, floorTiles, condenseProgress)
}

/** @deprecated Import from venueWallModel directly if needed outside broadcast meta. */
export { venueHeadlineCondenseCaptionParts, type VenueCondenseProgressModel }
