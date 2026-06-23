import type { CSSProperties } from 'react'
import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'

/** Table-count band for composed-stage typography and spacing. */
export type ShowdownStageDensityTier = 'hero' | 'spacious' | 'standard' | 'compact' | 'dense'

export type ShowdownStageCardScale = 'wide' | 'rise'

const NAMEPLATE_ROW_WIDTH = 'min(46%, 92%)'

type RiseCardPreset = Readonly<{
  '--vfd-stage-card-h': string
  '--vfd-stage-card-w': string
  '--vfd-stage-card-gap': string
  '--vfd-stage-cards-rise': string
  '--vfd-stage-cards-row-width'?: string
}>

/** QA-tuned rise presets — one entry per mosaic table count. */
const RISE_CARD_PRESETS: Readonly<Record<number, RiseCardPreset>> = {
  2: {
    '--vfd-stage-card-h': 'max(1.52rem, min(19.8cqw, 14.5cqh)',
    '--vfd-stage-card-w': 'max(1.08rem, min(14.25cqw, 10.5cqh)',
    '--vfd-stage-card-gap': 'min(0.82cqw, 0.52cqh)',
    '--vfd-stage-cards-rise': 'max(0.52rem, 2.95cqh)',
    '--vfd-stage-cards-row-width': NAMEPLATE_ROW_WIDTH,
  },
  7: {
    '--vfd-stage-card-h': 'max(1.5rem, min(19.2cqw, 14.1cqh)',
    '--vfd-stage-card-w': 'max(1.06rem, min(13.85cqw, 10.25cqh)',
    '--vfd-stage-card-gap': 'min(0.8cqw, 0.5cqh)',
    '--vfd-stage-cards-rise': 'max(0.54rem, 3.05cqh)',
    '--vfd-stage-cards-row-width': NAMEPLATE_ROW_WIDTH,
  },
  8: {
    '--vfd-stage-card-h': 'max(1.48rem, min(18.8cqw, 13.85cqh)',
    '--vfd-stage-card-w': 'max(1.04rem, min(13.5cqw, 10cqh)',
    '--vfd-stage-card-gap': 'min(0.78cqw, 0.49cqh)',
    '--vfd-stage-cards-rise': 'max(0.53rem, 3cqh)',
    '--vfd-stage-cards-row-width': NAMEPLATE_ROW_WIDTH,
  },
  13: {
    '--vfd-stage-card-h': 'max(1.62rem, min(19.2cqw, 14.55cqh)',
    '--vfd-stage-card-w': 'max(1.12rem, min(13.55cqw, 10.1cqh)',
    '--vfd-stage-card-gap': 'min(0.88cqw, 0.56cqh)',
    '--vfd-stage-cards-rise': 'max(0.56rem, 2.9cqh)',
  },
  14: {
    '--vfd-stage-card-h': 'max(1.56rem, min(18.4cqw, 13.95cqh)',
    '--vfd-stage-card-w': 'max(1.08rem, min(13.1cqw, 9.75cqh)',
    '--vfd-stage-card-gap': 'min(0.84cqw, 0.53cqh)',
    '--vfd-stage-cards-rise': 'max(0.58rem, 3.15cqh)',
    '--vfd-stage-cards-row-width': NAMEPLATE_ROW_WIDTH,
  },
  15: {
    '--vfd-stage-card-h': 'max(1.54rem, min(18.1cqw, 13.75cqh)',
    '--vfd-stage-card-w': 'max(1.06rem, min(12.85cqw, 9.6cqh)',
    '--vfd-stage-card-gap': 'min(0.82cqw, 0.52cqh)',
    '--vfd-stage-cards-rise': 'max(0.58rem, 3.2cqh)',
    '--vfd-stage-cards-row-width': NAMEPLATE_ROW_WIDTH,
  },
}

/** QA card layout bands — keyed to mosaic table count, not density tier alone. */
export function showdownStageCardScaleBand(tableCount: number): ShowdownStageCardScale | null {
  const n = Math.max(1, Math.floor(tableCount))
  if (n === 3 || n === 4 || n === 9) return 'wide'
  if (n in RISE_CARD_PRESETS) return 'rise'
  return null
}

/** Per-count card token overrides on `.vfd-showdown-stage-frame`. */
export function showdownStageCardFrameVars(tableCount: number): CSSProperties | undefined {
  const n = Math.max(1, Math.floor(tableCount))
  const rise = RISE_CARD_PRESETS[n]
  if (rise) return { ...rise } as CSSProperties

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
  if (n === 9) {
    return {
      '--vfd-stage-card-h': 'max(1.75rem, min(22.5cqw, 17cqh)',
      '--vfd-stage-card-w': 'max(1.28rem, min(16.5cqw, 12.25cqh)',
      '--vfd-stage-card-gap': 'min(1.05cqw, 0.68cqh)',
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
