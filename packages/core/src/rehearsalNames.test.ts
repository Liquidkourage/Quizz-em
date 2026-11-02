import { describe, expect, it } from 'vitest'
import { rehearsalSeatDisplayName } from './displayPreviewFixture'
import { VENUE_NUMBERED_TABLE_MAX, VENUE_WALL_SEAT_SLOTS } from './venueConstants'

describe('rehearsalSeatDisplayName', () => {
  it('gives every seat in a full room its own name and initial', () => {
    const count = VENUE_NUMBERED_TABLE_MAX * VENUE_WALL_SEAT_SLOTS
    const names = Array.from({ length: count }, (_, i) => rehearsalSeatDisplayName(i))
    expect(new Set(names).size).toBe(count)
  })
})
