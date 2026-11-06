import { describe, expect, it } from 'vitest'
import { rooms, setVenueMosaicPreview, venueMosaicPreview } from './game-ops'

describe('setVenueMosaicPreview', () => {
  it('remembers a cosmetic count and forgets it without touching tables', () => {
    const before = rooms.size
    expect(setVenueMosaicPreview('preview', 6)).toBe(6)
    expect(venueMosaicPreview.get('PREVIEW')).toBe(6)
    expect(setVenueMosaicPreview('preview', null)).toBeNull()
    expect(venueMosaicPreview.has('PREVIEW')).toBe(false)
    expect(rooms.size).toBe(before)
    expect(setVenueMosaicPreview('preview', 0)).toBeNull()
  })
})
