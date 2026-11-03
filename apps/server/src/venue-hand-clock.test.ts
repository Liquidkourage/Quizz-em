import { describe, expect, it } from 'vitest'
import {
  noteVenueHandClock,
  noteVenuePhaseClock,
  resetVenueShuffleCounter,
  venuePhaseClockKey,
} from './venue-shuffle-settings'

describe('venue hand clock', () => {
  it('starts once per hand and clears when every table is between hands', () => {
    resetVenueShuffleCounter('CLK')
    expect(noteVenueHandClock('CLK', false, 5_000)).toBeNull()
    expect(noteVenueHandClock('CLK', true, 5_000)).toBe(5_000)
    expect(noteVenueHandClock('CLK', true, 9_000)).toBe(5_000)
    expect(noteVenueHandClock('CLK', false, 12_000)).toBeNull()
    expect(noteVenueHandClock('CLK', true, 12_000)).toBe(12_000)
    resetVenueShuffleCounter('CLK')
  })

  it('keeps the phase clock on open betting until that street changes', () => {
    resetVenueShuffleCounter('PHASE')
    const open = 'bet|1|T|cc0'
    const closed = 'bet|1|F|cc0'
    expect(venuePhaseClockKey([closed, 'answer', open])).toBe(open)
    expect(venuePhaseClockKey(['answer', 'answer'])).toBe('answer')
    expect(venuePhaseClockKey([])).toBeNull()
    expect(noteVenuePhaseClock('PHASE', open, 5_000)).toBe(5_000)
    expect(noteVenuePhaseClock('PHASE', open, 90_000)).toBe(5_000)
    expect(noteVenuePhaseClock('PHASE', 'bet|2|T|cc5', 120_000)).toBe(120_000)
    expect(noteVenuePhaseClock('PHASE', null, 130_000)).toBeNull()
    resetVenueShuffleCounter('PHASE')
  })
})
