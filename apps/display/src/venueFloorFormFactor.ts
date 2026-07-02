import {
  selectVenueFloorLayout,
  type VenueFloorLayoutPlan,
  type VenueFloorLayoutViewport,
} from './venueFloorLayout'

/** Named layout tiers for the public venue floor (populated table count). */
export type VenueFloorFormFactorId =
  | 'broadcast-1'
  | 'broadcast-2'
  | 'hero-3-4'
  | 'banquet-5-8'
  | 'wall-9-12'
  | 'wall-13-16'
  | 'wall-17-20'
  | 'wall-21-plus'

export type VenueFloorRenderer = 'broadcast' | 'mosaic'
export type VenueFloorUiScale = 'broadcast' | 'mosaic'
export type VenueFloorHeadline = 'broadcast-strip' | 'full'
export type VenueFloorRingMode = 'broadcast' | 'mosaic'
export type VenueFloorShowdownMode = 'broadcast-reveal' | 'mosaic-overlay'

export type VenueFloorFormFactor = {
  id: VenueFloorFormFactorId
  populatedTableCount: number
  hostFocusTable: number | null
  renderer: VenueFloorRenderer
  uiScale: VenueFloorUiScale
  headline: VenueFloorHeadline
  ringMode: VenueFloorRingMode
  broadcastDensity?: 'solo' | 'dual'
  layoutPlan: VenueFloorLayoutPlan
  showdown: VenueFloorShowdownMode
}

export type ResolveVenueFloorFormFactorInput = {
  populatedTableCount: number
  hostFocusTable?: number | null
  viewport?: VenueFloorLayoutViewport
  withHeadline?: boolean
}

/** Map populated table count to a stable form-factor id (ignoring host spotlight). */
export function venueFloorFormFactorIdForCount(populatedTableCount: number): VenueFloorFormFactorId {
  const n = Math.max(0, Math.floor(populatedTableCount))
  if (n <= 1) return 'broadcast-1'
  if (n === 2) return 'broadcast-2'
  if (n <= 4) return 'hero-3-4'
  if (n <= 8) return 'banquet-5-8'
  if (n <= 12) return 'wall-9-12'
  if (n <= 16) return 'wall-13-16'
  if (n <= 20) return 'wall-17-20'
  return 'wall-21-plus'
}

function broadcastFormFactor(
  id: 'broadcast-1' | 'broadcast-2',
  populatedTableCount: number,
  hostFocusTable: number | null,
  layoutPlan: VenueFloorLayoutPlan
): VenueFloorFormFactor {
  return {
    id,
    populatedTableCount,
    hostFocusTable,
    renderer: 'broadcast',
    uiScale: 'broadcast',
    headline: 'broadcast-strip',
    ringMode: 'broadcast',
    broadcastDensity: id === 'broadcast-1' ? 'solo' : 'dual',
    layoutPlan,
    showdown: 'broadcast-reveal',
  }
}

function mosaicFormFactor(
  id: VenueFloorFormFactorId,
  populatedTableCount: number,
  hostFocusTable: number | null,
  layoutPlan: VenueFloorLayoutPlan
): VenueFloorFormFactor {
  return {
    id,
    populatedTableCount,
    hostFocusTable,
    renderer: 'mosaic',
    uiScale: 'mosaic',
    headline: 'full',
    ringMode: 'mosaic',
    layoutPlan,
    showdown: 'mosaic-overlay',
  }
}

/**
 * Resolve the venue floor form factor from populated table count and host spotlight.
 * Returns null when no populated tables should render a floor.
 */
export function resolveVenueFloorFormFactor(
  input: ResolveVenueFloorFormFactorInput
): VenueFloorFormFactor | null {
  const populatedTableCount = Math.max(0, Math.floor(input.populatedTableCount))
  if (populatedTableCount <= 0) return null

  const hostFocusTable = input.hostFocusTable ?? null
  const layoutPlan = selectVenueFloorLayout({
    tableCount: populatedTableCount,
    viewport: input.viewport,
    withHeadline: input.withHeadline,
  })

  const id = venueFloorFormFactorIdForCount(populatedTableCount)
  const useBroadcast = hostFocusTable == null && (id === 'broadcast-1' || id === 'broadcast-2')

  if (useBroadcast) {
    return broadcastFormFactor(id as 'broadcast-1' | 'broadcast-2', populatedTableCount, hostFocusTable, layoutPlan)
  }

  return mosaicFormFactor(id, populatedTableCount, hostFocusTable, layoutPlan)
}

export function isBroadcastVenueFloorFormFactor(
  formFactor: VenueFloorFormFactor | null | undefined
): formFactor is VenueFloorFormFactor & { renderer: 'broadcast' } {
  return formFactor?.renderer === 'broadcast'
}

export function isSingleTableVenueFloorFormFactor(
  formFactor: VenueFloorFormFactor | null | undefined
): boolean {
  return formFactor?.id === 'broadcast-1'
}

export function isDualTableVenueFloorFormFactor(
  formFactor: VenueFloorFormFactor | null | undefined
): boolean {
  return formFactor?.id === 'broadcast-2'
}

/** AnimatePresence key for the floor body region. */
export function venueFloorFormFactorBodyKey(
  formFactor: VenueFloorFormFactor,
  opts: { showHeroSpotlight: boolean; hostFocusTable: number | null }
): string {
  if (formFactor.renderer === 'broadcast') return formFactor.id
  if (opts.showHeroSpotlight && opts.hostFocusTable != null) {
    return `spotlight-${opts.hostFocusTable}`
  }
  return `floor-${formFactor.id}`
}
