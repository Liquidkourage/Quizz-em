import { describe, expect, it } from 'vitest'
import { noteVenueHandClock, resetVenueShuffleCounter } from './venue-shuffle-settings'

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
})
