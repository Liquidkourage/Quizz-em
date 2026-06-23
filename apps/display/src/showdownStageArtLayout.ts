import type { CSSProperties } from 'react'
import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'

/** Table-count band for composed-stage typography and spacing. */
export type ShowdownStageDensityTier = 'hero' | 'spacious' | 'standard' | 'compact' | 'dense'

export type ShowdownStageCardScale = 'wide' | 'lift'

/** QA card-size nudge bands — keyed to mosaic table count, not density tier alone. */
export function showdownStageCardScaleBand(tableCount: number): ShowdownStageCardScale | null {
  const n = Math.max(1, Math.floor(tableCount))
  if (n === 3 || n === 4 || n === 9) return 'wide'
  if (n === 2 || n === 7 || n === 8 || n === 13 || n === 14 || n === 15) return 'lift'
  return null
}

/** Per-count card token overrides on `.vfd-showdown-stage-frame`. */
export function showdownStageCardFrameVars(tableCount: number): CSSProperties | undefined {
  const band = showdownStageCardScaleBand(tableCount)
  if (band === 'wide') {
    return {
      '--vfd-stage-card-h': 'max(2rem, min(26cqw, 19.5cqh)',
      '--vfd-stage-card-w': 'max(1.45rem, min(19cqw, 14.25cqh)',
      '--vfd-stage-card-gap': 'min(1.15cqw, 0.75cqh)',
    } as CSSProperties
  }
  if (band === 'lift') {
    const n = Math.max(1, Math.floor(tableCount))
    if (n >= 12 && n < SHOWDOWN_DENSE_MIN_TABLE_COUNT) {
      return {
        '--vfd-stage-card-h': 'max(1.76rem, min(21cqw, 15.9cqh)',
        '--vfd-stage-card-w': 'max(1.23rem, min(14.85cqw, 11.05cqh)',
        '--vfd-stage-card-gap': 'min(0.97cqw, 0.62cqh)',
      } as CSSProperties
    }
    return {
      '--vfd-stage-card-h': 'max(1.59rem, min(18.96cqw, 13.84cqh)',
      '--vfd-stage-card-w': 'max(1.13rem, min(13.33cqw, 9.74cqh)',
      '--vfd-stage-card-gap': 'min(0.87cqw, 0.53cqh)',
    } as CSSProperties
  }
  return undefined
}

export function showdownStageDensityTier(tableCount: number): ShowdownStageDensityTier {
  const n = Math.max(1, Math.floor(tableCount))
  if (n <= 1) return 'hero'
  if (n <= 4) return 'spacious'
  if (n <= 11) return 'standard'
  if (n < SHOWDOWN_DENSE_MIN_TABLE_COUNT) return 'compact'
  return 'dense'
}
