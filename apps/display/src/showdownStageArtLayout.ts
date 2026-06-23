import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'

/** Table-count band for composed-stage typography and spacing. */
export type ShowdownStageDensityTier = 'hero' | 'spacious' | 'standard' | 'compact' | 'dense'

export type ShowdownStageCardScale = 'wide' | 'rise'

/** Mosaic table counts with QA-tuned card CSS in index.css ([data-stage-table-count]). */
export const SHOWDOWN_STAGE_RISE_TABLE_COUNTS = [2, 7, 8, 13, 14, 15] as const
export const SHOWDOWN_STAGE_WIDE_TABLE_COUNTS = [3, 4, 9] as const

/** QA card layout bands — keyed to mosaic table count, not density tier alone. */
export function showdownStageCardScaleBand(tableCount: number): ShowdownStageCardScale | null {
  const n = Math.max(1, Math.floor(tableCount))
  if ((SHOWDOWN_STAGE_WIDE_TABLE_COUNTS as readonly number[]).includes(n)) return 'wide'
  if ((SHOWDOWN_STAGE_RISE_TABLE_COUNTS as readonly number[]).includes(n)) return 'rise'
  return null
}

export function showdownStageDensityTier(tableCount: number): ShowdownStageDensityTier {
  const n = Math.max(1, Math.floor(tableCount))
  if (n <= 1) return 'hero'
  if (n <= 4) return 'spacious'
  if (n <= 11) return 'standard'
  if (n < SHOWDOWN_DENSE_MIN_TABLE_COUNT) return 'compact'
  return 'dense'
}
