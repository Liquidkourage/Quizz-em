import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  selectVenueFloorLayout,
  type VenueFloorLayoutPlan,
  type VenueFloorLayoutViewport,
} from './venueFloorLayout'
import {
  formatVenueHeadlineCondensePart,
  venueHeadlineCondenseCaptionParts,
  type VenueCondenseProgressModel,
} from './venueWallModel'
import type { ShowdownStageDensityTier } from './showdownStageArtLayout'
import type { VenueFloorPublicTypographyTier, VenueFloorTableSize } from './venueFloorGridLayout'
import {
  venueFloorFeltDensityForSizingCount,
  venueFloorMosaicTypographyTierForSizingCount,
  venueFloorShowdownDenseLayout,
  venueFloorShowdownStageDensityForSizingCount,
} from './venueFloorSpecCounts'

/** Named venue-floor tiers keyed by populated table count. */
export type VenueFloorSpecId =
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
export type VenueFloorTypographyProfile = 'broadcast' | VenueFloorPublicTypographyTier
export type VenueFloorBroadcastMetaTemplate = 'final-table' | 'multi-table'

export type VenueFloorSpecTierDefinition = {
  id: VenueFloorSpecId
  renderer: VenueFloorRenderer
  uiScale: VenueFloorUiScale
  headline: VenueFloorHeadline
  ringMode: VenueFloorRingMode
  broadcastDensity?: 'solo' | 'dual'
  showdown: VenueFloorShowdownMode
  typographyProfile: VenueFloorTypographyProfile
  compactHeadline: boolean
  ultraCompactHeadline: boolean
  broadcastMetaTemplate?: VenueFloorBroadcastMetaTemplate
}

/** Static tier definitions — the only place renderer/headline/showdown breakpoints live. */
export const VENUE_FLOOR_SPEC_TIERS: Readonly<Record<VenueFloorSpecId, VenueFloorSpecTierDefinition>> = {
  'broadcast-1': {
    id: 'broadcast-1',
    renderer: 'broadcast',
    uiScale: 'broadcast',
    headline: 'broadcast-strip',
    ringMode: 'broadcast',
    broadcastDensity: 'solo',
    showdown: 'broadcast-reveal',
    typographyProfile: 'broadcast',
    compactHeadline: false,
    ultraCompactHeadline: false,
    broadcastMetaTemplate: 'final-table',
  },
  'broadcast-2': {
    id: 'broadcast-2',
    renderer: 'broadcast',
    uiScale: 'broadcast',
    headline: 'broadcast-strip',
    ringMode: 'broadcast',
    broadcastDensity: 'dual',
    showdown: 'broadcast-reveal',
    typographyProfile: 'broadcast',
    compactHeadline: false,
    ultraCompactHeadline: false,
    broadcastMetaTemplate: 'multi-table',
  },
  'hero-3-4': {
    id: 'hero-3-4',
    renderer: 'mosaic',
    uiScale: 'mosaic',
    headline: 'full',
    ringMode: 'mosaic',
    showdown: 'mosaic-overlay',
    typographyProfile: 'spacious',
    compactHeadline: false,
    ultraCompactHeadline: false,
  },
  'banquet-5-8': {
    id: 'banquet-5-8',
    renderer: 'mosaic',
    uiScale: 'mosaic',
    headline: 'full',
    ringMode: 'mosaic',
    showdown: 'mosaic-overlay',
    typographyProfile: 'spacious',
    compactHeadline: false,
    ultraCompactHeadline: false,
  },
  'wall-9-12': {
    id: 'wall-9-12',
    renderer: 'mosaic',
    uiScale: 'mosaic',
    headline: 'full',
    ringMode: 'mosaic',
    showdown: 'mosaic-overlay',
    typographyProfile: 'standard',
    compactHeadline: false,
    ultraCompactHeadline: false,
  },
  'wall-13-16': {
    id: 'wall-13-16',
    renderer: 'mosaic',
    uiScale: 'mosaic',
    headline: 'full',
    ringMode: 'mosaic',
    showdown: 'mosaic-overlay',
    typographyProfile: 'standard',
    compactHeadline: true,
    ultraCompactHeadline: false,
  },
  'wall-17-20': {
    id: 'wall-17-20',
    renderer: 'mosaic',
    uiScale: 'mosaic',
    headline: 'full',
    ringMode: 'mosaic',
    showdown: 'mosaic-overlay',
    typographyProfile: 'compact',
    compactHeadline: true,
    ultraCompactHeadline: true,
  },
  'wall-21-plus': {
    id: 'wall-21-plus',
    renderer: 'mosaic',
    uiScale: 'mosaic',
    headline: 'full',
    ringMode: 'mosaic',
    showdown: 'mosaic-overlay',
    typographyProfile: 'compact',
    compactHeadline: true,
    ultraCompactHeadline: true,
  },
}

export type VenueFloorSpec = {
  id: VenueFloorSpecId
  /** Populated felts on the floor — drives routing (broadcast vs mosaic). */
  populatedTableCount: number
  /** Max(populated, venue live) — drives felt sizing and mosaic typography. */
  sizingTableCount: number
  hostFocusTable: number | null
  showHeroSpotlight: boolean
  renderer: VenueFloorRenderer
  uiScale: VenueFloorUiScale
  headline: VenueFloorHeadline
  ringMode: VenueFloorRingMode
  broadcastDensity?: 'solo' | 'dual'
  layoutPlan: VenueFloorLayoutPlan
  feltDensity: VenueFloorTableSize
  typographyProfile: VenueFloorTypographyProfile
  mosaicTypographyTier: VenueFloorPublicTypographyTier
  typographyRootClass: string
  compactHeadline: boolean
  ultraCompactHeadline: boolean
  showdown: VenueFloorShowdownMode
  showdownStageDensity: ShowdownStageDensityTier
  showdownDenseLayout: boolean
  broadcastMetaTemplate?: VenueFloorBroadcastMetaTemplate
}

export type ResolveVenueFloorSpecInput = {
  populatedTableCount: number
  hostFocusTable?: number | null
  venueLiveTableCount?: number | null
  viewport?: VenueFloorLayoutViewport
  withHeadline?: boolean
}

/** Map populated table count to a tier id (ignoring host spotlight). */
export function venueFloorSpecIdForCount(populatedTableCount: number): VenueFloorSpecId {
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

export function venueFloorTypographyRootClass(profile: VenueFloorTypographyProfile): string {
  if (profile === 'broadcast') return 'venue-floor-typography-broadcast'
  return `venue-floor-typography-${profile}`
}

function resolveSizingTableCount(
  populatedTableCount: number,
  venueLiveTableCount?: number | null
): number {
  const live =
    typeof venueLiveTableCount === 'number' && Number.isFinite(venueLiveTableCount)
      ? Math.floor(venueLiveTableCount)
      : populatedTableCount
  return Math.max(populatedTableCount, live)
}

function applyHostSpotlightOverride(
  tier: VenueFloorSpecTierDefinition,
  hostFocusTable: number | null,
  sizingTableCount: number
): VenueFloorSpecTierDefinition {
  if (hostFocusTable == null) return tier
  if (tier.id !== 'broadcast-1' && tier.id !== 'broadcast-2') return tier
  return {
    ...tier,
    renderer: 'mosaic',
    uiScale: 'mosaic',
    headline: 'full',
    ringMode: 'mosaic',
    broadcastDensity: undefined,
    showdown: 'mosaic-overlay',
    typographyProfile: venueFloorMosaicTypographyTierForSizingCount(sizingTableCount),
    broadcastMetaTemplate: undefined,
  }
}

/**
 * Authoritative venue floor spec from table count, host focus, and optional viewport.
 * Returns null when no populated tables should render a floor.
 */
export function resolveVenueFloorSpec(input: ResolveVenueFloorSpecInput): VenueFloorSpec | null {
  const populatedTableCount = Math.max(0, Math.floor(input.populatedTableCount))
  if (populatedTableCount <= 0) return null

  const hostFocusTable = input.hostFocusTable ?? null
  const sizingTableCount = resolveSizingTableCount(populatedTableCount, input.venueLiveTableCount)
  const baseTier = VENUE_FLOOR_SPEC_TIERS[venueFloorSpecIdForCount(populatedTableCount)]
  const tier = applyHostSpotlightOverride(baseTier, hostFocusTable, sizingTableCount)

  const layoutPlan = selectVenueFloorLayout({
    tableCount: populatedTableCount,
    viewport: input.viewport,
    withHeadline: input.withHeadline,
  })

  const feltDensity = venueFloorFeltDensityForSizingCount(sizingTableCount)
  const mosaicTypographyTier = venueFloorMosaicTypographyTierForSizingCount(sizingTableCount)
  const typographyProfile: VenueFloorTypographyProfile =
    tier.typographyProfile === 'broadcast'
      ? 'broadcast'
      : mosaicTypographyTier

  const showHeroSpotlight = hostFocusTable != null && tier.renderer === 'mosaic'

  return {
    id: tier.id,
    populatedTableCount,
    sizingTableCount,
    hostFocusTable,
    showHeroSpotlight,
    renderer: tier.renderer,
    uiScale: tier.uiScale,
    headline: tier.headline,
    ringMode: tier.ringMode,
    broadcastDensity: tier.broadcastDensity,
    layoutPlan: { ...layoutPlan, density: feltDensity },
    feltDensity,
    typographyProfile,
    mosaicTypographyTier,
    typographyRootClass: venueFloorTypographyRootClass(typographyProfile),
    compactHeadline: tier.compactHeadline,
    ultraCompactHeadline: tier.ultraCompactHeadline,
    showdown: tier.showdown,
    showdownStageDensity:
      venueFloorShowdownStageDensityForSizingCount(sizingTableCount) as ShowdownStageDensityTier,
    showdownDenseLayout: venueFloorShowdownDenseLayout(sizingTableCount),
    broadcastMetaTemplate: tier.broadcastMetaTemplate,
  }
}

export function isBroadcastVenueFloorSpec(
  spec: VenueFloorSpec | null | undefined
): spec is VenueFloorSpec & { renderer: 'broadcast' } {
  return spec?.renderer === 'broadcast'
}

export function venueFloorSpecBodyKey(
  spec: VenueFloorSpec,
  opts: { showHeroSpotlight: boolean; hostFocusTable: number | null }
): string {
  if (spec.renderer === 'broadcast') return spec.id
  if (opts.showHeroSpotlight && opts.hostFocusTable != null) {
    return `spotlight-${opts.hostFocusTable}`
  }
  return `floor-${spec.id}`
}

export function venueFloorSpecUsesBroadcastHeadline(spec: VenueFloorSpec | null | undefined): boolean {
  return spec?.headline === 'broadcast-strip'
}

export function venueFloorSpecUsesBroadcastUiScale(spec: VenueFloorSpec | null | undefined): boolean {
  return spec?.uiScale === 'broadcast'
}

export function venueFloorSpecMainPaddingClass(spec: VenueFloorSpec | null | undefined): string {
  return venueFloorSpecUsesBroadcastUiScale(spec) ? 'px-1 pb-0' : 'px-3 sm:px-4'
}

export function venueFloorSpecMainPbClass(
  spec: VenueFloorSpec | null | undefined,
  compactHeadline: boolean
): string {
  if (compactHeadline) return 'pb-0.5 sm:pb-1'
  return venueFloorSpecUsesBroadcastUiScale(spec) ? 'pb-0' : 'pb-3 sm:pb-4'
}

export function showdownStageViewportFromSpec(
  spec: VenueFloorSpec | null | undefined
): 'mosaic' | 'broadcast' {
  return spec?.showdown === 'broadcast-reveal' ? 'broadcast' : 'mosaic'
}

export function showdownLayoutTableCountFromSpec(
  spec: VenueFloorSpec | null | undefined,
  opts?: { mosaicLayoutTableCount?: number }
): number {
  if (spec?.showdown === 'broadcast-reveal') {
    return spec.id === 'broadcast-2' ? 2 : 1
  }
  return opts?.mosaicLayoutTableCount ?? spec?.sizingTableCount ?? 1
}

/** Broadcast headline meta line — driven by spec template, not raw table count. */
export function buildVenueFloorHeadlineMeta(
  spec: VenueFloorSpec,
  floorTiles: readonly DisplayVenueTileSnapshot[],
  condenseProgress: VenueCondenseProgressModel | null
): string | null {
  if (spec.headline !== 'broadcast-strip') return null
  if (floorTiles.length === 0) return null

  if (spec.broadcastMetaTemplate === 'final-table') {
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

export {
  venueFloorFeltDensityForSizingCount,
  venueFloorMosaicTypographyTierForSizingCount,
  venueFloorShowdownStageDensityForSizingCount,
  venueFloorShowdownDenseLayout,
} from './venueFloorSpecCounts'
