import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'

/** Table-count band for composed-stage typography and spacing. */
export type ShowdownStageDensityTier = 'hero' | 'spacious' | 'standard' | 'compact' | 'dense'

export function showdownStageDensityTier(tableCount: number): ShowdownStageDensityTier {
  const n = Math.max(1, Math.floor(tableCount))
  if (n <= 1) return 'hero'
  if (n <= 4) return 'spacious'
  if (n <= 11) return 'standard'
  if (n < SHOWDOWN_DENSE_MIN_TABLE_COUNT) return 'compact'
  return 'dense'
}
