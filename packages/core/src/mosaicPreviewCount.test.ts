import { describe, expect, it } from 'vitest'
import { VENUE_NUMBERED_TABLE_MAX } from './venueConstants'
import { parseMosaicPreviewCount } from './mosaicPreviewCount'

describe('parseMosaicPreviewCount', () => {
  it('clears on null and accepts every table count the wall can show', () => {
    expect(parseMosaicPreviewCount(null)).toBeNull()
    expect(parseMosaicPreviewCount(1)).toBe(1)
    expect(parseMosaicPreviewCount(VENUE_NUMBERED_TABLE_MAX)).toBe(VENUE_NUMBERED_TABLE_MAX)
    expect(parseMosaicPreviewCount(6)).toBe(6)
  })

  it('rejects a count the wall cannot show', () => {
    expect(parseMosaicPreviewCount(0)).toBeUndefined()
    expect(parseMosaicPreviewCount(VENUE_NUMBERED_TABLE_MAX + 1)).toBeUndefined()
    expect(parseMosaicPreviewCount(1.5)).toBeUndefined()
    expect(parseMosaicPreviewCount('6')).toBeUndefined()
    expect(parseMosaicPreviewCount(undefined)).toBeUndefined()
  })
})
