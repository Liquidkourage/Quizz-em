import { describe, expect, it } from 'vitest'
import { createEmptyGame, LOBBY_TABLE_ID, rosterMaxPlayers } from './index'
import { VENUE_NUMBERED_TABLE_MAX, VENUE_WALL_SEAT_SLOTS } from './venueConstants'

describe('roster size', () => {
  it('lets the lobby fill every table instead of stopping at 32', () => {
    expect(rosterMaxPlayers(LOBBY_TABLE_ID)).toBe(VENUE_NUMBERED_TABLE_MAX * VENUE_WALL_SEAT_SLOTS)
    expect(createEmptyGame('V', 'h', LOBBY_TABLE_ID).maxPlayers).toBe(
      VENUE_NUMBERED_TABLE_MAX * VENUE_WALL_SEAT_SLOTS,
    )
  })

  it('keeps a felt at 8 seats', () => {
    expect(rosterMaxPlayers('1')).toBe(VENUE_WALL_SEAT_SLOTS)
    expect(createEmptyGame('V', 'h', '1').maxPlayers).toBe(VENUE_WALL_SEAT_SLOTS)
  })
})
