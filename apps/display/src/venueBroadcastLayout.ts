import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { STADIUM_REFERENCE_TABLE_WIDTH_PX } from '@qhe/ui'

/**
 * Felt scale for broadcast graphics.
 * One table keeps a full-table floor. Two tables follow the measured felt
 * so the board, pot, and to-call line stay in proportion with the oval.
 */
export function broadcastFeltScale(rimW: number, density: 'solo' | 'dual'): number {
  const w = rimW > 0 ? rimW : STADIUM_REFERENCE_TABLE_WIDTH_PX
  const proportional = w / STADIUM_REFERENCE_TABLE_WIDTH_PX
  if (density === 'dual') return Math.max(0.48, Math.min(1.05, proportional))
  return Math.max(0.78, Math.min(2.05, proportional))
}

/** Community card width at scale 1. Matches the two-table board. */
const DUAL_COMMUNITY_CARD_WIDTH_PX = 76

/**
 * Two-table hole cards: the same card size as that felt's community board,
 * fanned the way the 3+ mosaic fans them.
 */
export function dualBroadcastHoleCardBoxPx(rimW: number): {
  widthPx: number
  heightPx: number
  overlapPx: number
} {
  const widthPx = Math.max(28, Math.round(DUAL_COMMUNITY_CARD_WIDTH_PX * broadcastFeltScale(rimW, 'dual')))
  const heightPx = Math.round((widthPx * 7) / 5)
  const overlapPx = Math.max(8, Math.round(widthPx * 0.36))
  return { widthPx, heightPx, overlapPx }
}

/** Two-table pairs sit further onto the green than a mosaic tile, clear of the button. */
export const DUAL_BROADCAST_HOLE_INWARD_FRAC = 0.36
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
