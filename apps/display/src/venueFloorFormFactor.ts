/**
 * @deprecated Use {@link venueFloorSpec} — form-factor types alias the authoritative spec.
 */
export type {
  VenueFloorSpecId as VenueFloorFormFactorId,
  VenueFloorRenderer,
  VenueFloorUiScale,
  VenueFloorHeadline,
  VenueFloorRingMode,
  VenueFloorShowdownMode,
  VenueFloorSpec as VenueFloorFormFactor,
  ResolveVenueFloorSpecInput as ResolveVenueFloorFormFactorInput,
} from './venueFloorSpec'

export {
  venueFloorSpecIdForCount as venueFloorFormFactorIdForCount,
  resolveVenueFloorSpec as resolveVenueFloorFormFactor,
  isBroadcastVenueFloorSpec as isBroadcastVenueFloorFormFactor,
  venueFloorSpecBodyKey as venueFloorFormFactorBodyKey,
} from './venueFloorSpec'

import type { VenueFloorSpec } from './venueFloorSpec'

export function isSingleTableVenueFloorFormFactor(
  spec: VenueFloorSpec | null | undefined
): boolean {
  return spec?.id === 'broadcast-1'
}

export function isDualTableVenueFloorFormFactor(
  spec: VenueFloorSpec | null | undefined
): boolean {
  return spec?.id === 'broadcast-2'
}
