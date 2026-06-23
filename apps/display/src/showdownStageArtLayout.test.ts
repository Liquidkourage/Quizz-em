import { describe, expect, it } from 'vitest'
import { SHOWDOWN_DENSE_MIN_TABLE_COUNT } from './showdownStageDenseRubric'
import { showdownStageDensityTier } from './showdownStageArtLayout'

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
