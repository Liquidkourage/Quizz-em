export type ShowdownStageArtLayout = 'landscape' | 'portrait'

/** Table-count band for rubric / art-scale tuning (from venue-floor QA). */
export type ShowdownStageDensityTier = 'hero' | 'spacious' | 'standard' | 'compact'

export function showdownStageDensityTier(tableCount: number): ShowdownStageDensityTier {
  const n = Math.max(1, Math.floor(tableCount))
  if (n <= 1) return 'hero'
  if (n <= 4) return 'spacious'
  if (n <= 11) return 'standard'
  return 'compact'
}

/** Pick art fit from the winner-stage tile clip box. */
export function showdownStageArtLayoutForBox(width: number, height: number): ShowdownStageArtLayout {
  if (width <= 0 || height <= 0) return 'landscape'
  return width / height < 1.08 ? 'portrait' : 'landscape'
}

export const WINNER_STAGE_ART_SCALE_LANDSCAPE = 1.2
export const WINNER_STAGE_ART_SCALE_PORTRAIT = 1

/** Landscape zoom — lower on spacious floors so the wreath is not clipped wide (QA: 2-up). */
export function winnerStageArtScale(
  layout: ShowdownStageArtLayout,
  tableCount: number
): number {
  if (layout === 'portrait') {
    return showdownStageDensityTier(tableCount) === 'spacious' ? 0.94 : WINNER_STAGE_ART_SCALE_PORTRAIT
  }
  const tier = showdownStageDensityTier(tableCount)
  if (tier === 'spacious') return 1.08
  if (tier === 'standard') return 1.14
  return WINNER_STAGE_ART_SCALE_LANDSCAPE
}
