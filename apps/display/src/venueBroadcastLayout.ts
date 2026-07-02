import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  formatVenueHeadlineCondensePart,
  venueHeadlineCondenseCaptionParts,
  type VenueCondenseProgressModel,
} from './venueWallModel'

/** Populated felts that use sports-bar broadcast (not mosaic floor). */
export const VENUE_BROADCAST_TABLE_MAX = 2

export function isVenueBroadcastFloor(
  populatedTableCount: number,
  hostFocusTable: number | null
): boolean {
  if (hostFocusTable != null) return false
  return populatedTableCount >= 1 && populatedTableCount <= VENUE_BROADCAST_TABLE_MAX
}

export function isVenueSingleTableBroadcast(
  populatedTableCount: number,
  hostFocusTable: number | null
): boolean {
  return isVenueBroadcastFloor(populatedTableCount, hostFocusTable) && populatedTableCount === 1
}

export function isVenueDualTableBroadcast(
  populatedTableCount: number,
  hostFocusTable: number | null
): boolean {
  return isVenueBroadcastFloor(populatedTableCount, hostFocusTable) && populatedTableCount === 2
}

export function buildVenueBroadcastMetaLine(
  floorTiles: readonly DisplayVenueTileSnapshot[],
  condenseProgress: VenueCondenseProgressModel | null
): string | null {
  if (floorTiles.length === 0) return null

  if (floorTiles.length === 1) {
    const parts: string[] = ['Final table']
    const seated = floorTiles[0]?.seated
    if (typeof seated === 'number' && seated > 0) parts.push(`${seated} players`)
    if (condenseProgress != null) {
      const survivorPart = venueHeadlineCondenseCaptionParts(condenseProgress).find((p) =>
        /remaining/i.test(p)
      )
      if (survivorPart) parts.push(survivorPart.replace(/\s*remaining/i, ' left'))
    }
    return parts.join(' · ')
  }

  const parts: string[] = [`${floorTiles.length} tables`]
  if (condenseProgress != null) {
    for (const part of venueHeadlineCondenseCaptionParts(condenseProgress)) {
      parts.push(formatVenueHeadlineCondensePart(part))
    }
  } else {
    const seatedTotal = floorTiles.reduce((sum, tile) => {
      const seated = tile.seated
      return sum + (typeof seated === 'number' && seated > 0 ? seated : 0)
    }, 0)
    if (seatedTotal > 0) parts.unshift(`${seatedTotal} players`)
  }
  return parts.join(' · ')
}
