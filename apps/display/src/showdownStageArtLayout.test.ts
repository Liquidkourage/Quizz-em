import { describe, expect, it } from 'vitest'
import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'
import {
  showdownStageCardScaleBand,
  showdownStageCardFrameVars,
  showdownStageDensityTier,
} from './showdownStageArtLayout'

describe('showdownStageDensityTier', () => {
  it('maps table counts to density bands', () => {
    expect(showdownStageDensityTier(1)).toBe('hero')
    expect(showdownStageDensityTier(4)).toBe('spacious')
    expect(showdownStageDensityTier(6)).toBe('standard')
    expect(showdownStageDensityTier(14)).toBe('compact')
    expect(showdownStageDensityTier(SHOWDOWN_DENSE_MIN_TABLE_COUNT - 1)).toBe('compact')
    expect(showdownStageDensityTier(SHOWDOWN_DENSE_MIN_TABLE_COUNT)).toBe('dense')
  })
})

describe('showdownStageCardScaleBand', () => {
  it('rises cards and trims card size for counts that overlap the laurel base', () => {
    for (const n of [2, 7, 8]) {
      expect(showdownStageCardScaleBand(n)).toBe('rise')
      expect(showdownStageCardFrameVars(n)).toMatchObject({
        '--vfd-stage-cards-rise': 'max(0.5rem, 2.5cqh)',
      })
    }
    for (const n of [13, 14, 15]) {
      expect(showdownStageCardScaleBand(n)).toBe('rise')
      expect(showdownStageCardFrameVars(n)).toMatchObject({
        '--vfd-stage-cards-rise': 'max(0.55rem, 2.75cqh)',
      })
    }
  })

  it('uses the wide nameplate band for 3, 4, and 9 tables', () => {
    for (const n of [3, 4, 9]) {
      expect(showdownStageCardScaleBand(n)).toBe('wide')
    }
  })

  it('leaves other counts on the default card tokens', () => {
    expect(showdownStageCardScaleBand(6)).toBeNull()
    expect(showdownStageCardScaleBand(12)).toBeNull()
    expect(showdownStageCardFrameVars(6)).toBeUndefined()
  })
})
