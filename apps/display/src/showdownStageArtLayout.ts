import type { CSSProperties } from 'react'
import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'

/** Table-count band for composed-stage typography and spacing. */
export type ShowdownStageDensityTier = 'hero' | 'spacious' | 'standard' | 'compact' | 'dense'

export type ShowdownStageCardScale = 'wide' | 'rise'

/** QA card layout bands — keyed to mosaic table count, not density tier alone. */
export function showdownStageCardScaleBand(tableCount: number): ShowdownStageCardScale | null {
  const n = Math.max(1, Math.floor(tableCount))
  if (n === 3 || n === 4 || n === 9) return 'wide'
  if (n === 2 || n === 7 || n === 8 || n === 13 || n === 14 || n === 15) return 'rise'
  return null
}

/** Per-count card token overrides on `.vfd-showdown-stage-frame`. */
export function showdownStageCardFrameVars(tableCount: number): CSSProperties | undefined {
  const band = showdownStageCardScaleBand(tableCount)
  const n = Math.max(1, Math.floor(tableCount))

  if (band === 'wide') {
    if (n === 3) {
      return {
        '--vfd-stage-card-h': 'max(1.65rem, min(21.5cqw, 16cqh)',
        '--vfd-stage-card-w': 'max(1.2rem, min(15.5cqw, 11.5cqh)',
        '--vfd-stage-card-gap': 'min(1cqw, 0.65cqh)',
      } as CSSProperties
    }
    if (n === 4) {
      return {
        '--vfd-stage-card-h': 'max(1.8rem, min(23.5cqw, 17.5cqh)',
        '--vfd-stage-card-w': 'max(1.32rem, min(17cqw, 12.75cqh)',
        '--vfd-stage-card-gap': 'min(1.05cqw, 0.7cqh)',
      } as CSSProperties
    }
    return {
      '--vfd-stage-card-h': 'max(1.75rem, min(22.5cqw, 17cqh)',
      '--vfd-stage-card-w': 'max(1.28rem, min(16.5cqw, 12.25cqh)',
      '--vfd-stage-card-gap': 'min(1.05cqw, 0.68cqh)',
    } as CSSProperties
  }

  if (band === 'rise') {
    if (n >= 13) {
      return {
        '--vfd-stage-card-h': 'max(1.64rem, min(19.5cqw, 14.75cqh)',
        '--vfd-stage-card-w': 'max(1.14rem, min(13.8cqw, 10.25cqh)',
        '--vfd-stage-card-gap': 'min(0.9cqw, 0.57cqh)',
        '--vfd-stage-cards-rise': 'max(0.55rem, 2.75cqh)',
      } as CSSProperties
    }
    return {
      '--vfd-stage-card-h': 'max(1.48rem, min(17.6cqw, 12.85cqh)',
      '--vfd-stage-card-w': 'max(1.05rem, min(12.35cqw, 9.05cqh)',
      '--vfd-stage-card-gap': 'min(0.8cqw, 0.5cqh)',
      '--vfd-stage-cards-rise': 'max(0.5rem, 2.5cqh)',
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
