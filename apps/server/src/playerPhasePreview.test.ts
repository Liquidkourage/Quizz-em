import { describe, expect, it } from 'vitest'
import { rooms, setVenuePlayerPhasePreview, venuePlayerPhasePreview } from './game-ops'

describe('setVenuePlayerPhasePreview', () => {
  it('remembers a cosmetic phone picture and forgets it without touching tables', () => {
    const before = rooms.size
    expect(setVenuePlayerPhasePreview('preview', 'turn')).toBe('turn')
    expect(venuePlayerPhasePreview.get('PREVIEW')).toBe('turn')
    expect(setVenuePlayerPhasePreview('preview', 'nope')).toBe('turn')
    expect(setVenuePlayerPhasePreview('preview', null)).toBeNull()
    expect(venuePlayerPhasePreview.has('PREVIEW')).toBe(false)
    expect(rooms.size).toBe(before)
  })
})
