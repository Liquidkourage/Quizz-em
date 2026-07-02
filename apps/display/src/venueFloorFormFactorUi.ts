import type { VenueFloorSpec, VenueFloorSpecId } from './venueFloorSpec'
import {
  buildVenueFloorHeadlineMeta,
  showdownLayoutTableCountFromSpec,
  showdownStageViewportFromSpec,
  venueFloorSpecMainPaddingClass,
  venueFloorSpecMainPbClass,
  venueFloorSpecUsesBroadcastHeadline,
  venueFloorSpecUsesBroadcastUiScale,
} from './venueFloorSpec'

/** @deprecated Use {@link VenueFloorSpec} and {@link resolveVenueFloorSpec} directly. */
export type { VenueFloorSpec as VenueFloorFormFactor, VenueFloorSpecId as VenueFloorFormFactorId } from './venueFloorSpec'

export function venueFloorLayoutTableCount(
  spec: VenueFloorSpec,
  _venueLiveTableCount?: number | null
): number {
  return spec.sizingTableCount
}

export const venueFloorFormFactorUsesBroadcastHeadline = venueFloorSpecUsesBroadcastHeadline
export const venueFloorFormFactorUsesBroadcastUiScale = venueFloorSpecUsesBroadcastUiScale
export const venueFloorFormFactorMainPaddingClass = venueFloorSpecMainPaddingClass
export const venueFloorFormFactorMainPbClass = venueFloorSpecMainPbClass
export const showdownStageViewportFromFormFactor = showdownStageViewportFromSpec
export const showdownLayoutTableCountFromFormFactor = showdownLayoutTableCountFromSpec

export function venueFloorFormFactorCompactHeadline(
  spec: VenueFloorSpec | null | undefined,
  _layoutTableCount?: number
): boolean {
  return spec?.compactHeadline ?? false
}

export function venueFloorFormFactorUltraCompactHeadline(
  spec: VenueFloorSpec | null | undefined,
  _layoutTableCount?: number
): boolean {
  return spec?.ultraCompactHeadline ?? false
}

export function venueFloorFormFactorMosaicDensity(
  spec: VenueFloorSpec
): VenueFloorSpec['feltDensity'] {
  return spec.feltDensity
}

export function venueFloorFormFactorIdLabel(id: VenueFloorSpecId): string {
  switch (id) {
    case 'broadcast-1':
      return 'Final table broadcast'
    case 'broadcast-2':
      return 'Dual table broadcast'
    case 'hero-3-4':
      return 'Hero mosaic (3–4 tables)'
    case 'banquet-5-8':
      return 'Banquet mosaic (5–8 tables)'
    case 'wall-9-12':
      return 'Wall mosaic (9–12 tables)'
    case 'wall-13-16':
      return 'Wall mosaic (13–16 tables)'
    case 'wall-17-20':
      return 'Wall mosaic (17–20 tables)'
    case 'wall-21-plus':
      return 'Wall mosaic (21+ tables)'
  }
}

export { buildVenueFloorHeadlineMeta as buildVenueBroadcastMetaLineFromSpec }
