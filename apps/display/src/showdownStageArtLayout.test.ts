import { describe, expect, it } from 'vitest'
import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'
import {
  SHOWDOWN_STAGE_RISE_TABLE_COUNTS,
  SHOWDOWN_STAGE_WIDE_TABLE_COUNTS,
  showdownStageCardScaleBand,
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
  it('tags rise counts tuned in CSS', () => {
    for (const n of SHOWDOWN_STAGE_RISE_TABLE_COUNTS) {
      expect(showdownStageCardScaleBand(n)).toBe('rise')
    }
  })

  it('tags wide counts tuned in CSS', () => {
    for (const n of SHOWDOWN_STAGE_WIDE_TABLE_COUNTS) {
      expect(showdownStageCardScaleBand(n)).toBe('wide')
    }
  })

  it('leaves other counts on the default card tokens', () => {
    expect(showdownStageCardScaleBand(6)).toBeNull()
    expect(showdownStageCardScaleBand(12)).toBeNull()
  })
})
