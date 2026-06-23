import { describe, expect, it } from 'vitest'
import { showdownStageDensityTier } from './showdownStageArtLayout'

describe('showdownStageDensityTier', () => {
  it('maps table counts to density bands', () => {
    expect(showdownStageDensityTier(1)).toBe('hero')
    expect(showdownStageDensityTier(4)).toBe('spacious')
    expect(showdownStageDensityTier(6)).toBe('standard')
    expect(showdownStageDensityTier(14)).toBe('compact')
  })
})
