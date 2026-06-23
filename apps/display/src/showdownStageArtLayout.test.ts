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
  it('lifts cards slightly for selected mid-density counts', () => {
    for (const n of [2, 7, 8, 13, 14, 15]) {
      expect(showdownStageCardScaleBand(n)).toBe('lift')
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
