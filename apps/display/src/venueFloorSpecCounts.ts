import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'

/** Matches {@link VenueFloorTableSize} in venueFloorGridLayout — kept here to avoid import cycles. */
export type VenueFloorFeltDensity = 'hero' | 'large' | 'medium' | 'compact' | 'micro'

/** Matches {@link VenueFloorPublicTypographyTier} in venueFloorGridLayout. */
export type VenueFloorMosaicTypographyTier = 'spacious' | 'standard' | 'compact'

/** Matches {@link ShowdownStageDensityTier} in showdownStageArtLayout. */
export type VenueFloorShowdownStageDensity =
  | 'hero'
  | 'spacious'
  | 'standard'
  | 'compact'
  | 'dense'

/** Felt chrome density from sizing table count. */
export function venueFloorFeltDensityForSizingCount(sizingTableCount: number): VenueFloorFeltDensity {
  const n = Math.max(0, Math.floor(sizingTableCount))
  if (n <= 2) return 'hero'
  if (n <= 4) return 'large'
  if (n <= 8) return 'large'
  if (n <= 12) return 'medium'
  if (n <= 15) return 'compact'
  return 'micro'
}

/** Mosaic headline/tile typography band from sizing table count. */
export function venueFloorMosaicTypographyTierForSizingCount(
  sizingTableCount: number
): VenueFloorMosaicTypographyTier {
  const n = Math.max(1, Math.floor(sizingTableCount))
  if (n <= 8) return 'spacious'
  if (n <= 15) return 'standard'
  return 'compact'
}

/** Composed mosaic showdown stage density from sizing table count. */
export function venueFloorShowdownStageDensityForSizingCount(
  sizingTableCount: number
): VenueFloorShowdownStageDensity {
  const n = Math.max(1, Math.floor(sizingTableCount))
  if (n <= 1) return 'hero'
  if (n <= 4) return 'spacious'
  if (n <= 11) return 'standard'
  if (n < SHOWDOWN_DENSE_MIN_TABLE_COUNT) return 'compact'
  return 'dense'
}

export function venueFloorShowdownDenseLayout(sizingTableCount: number): boolean {
  return Math.max(1, Math.floor(sizingTableCount)) >= SHOWDOWN_DENSE_MIN_TABLE_COUNT
}
