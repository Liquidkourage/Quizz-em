import { describe, expect, it } from 'vitest'
import { venueSeatingAnnouncementHasContent } from './useVenueSeatingAnnouncement'

describe('venueSeatingAnnouncementHasContent', () => {
  it('is false for empty payloads', () => {
    expect(venueSeatingAnnouncementHasContent(null)).toBe(false)
    expect(
      venueSeatingAnnouncementHasContent({
        moves: [],
        closedTableNums: [],
        shuffled: false,
        tablesBefore: 3,
        tablesAfter: 3,
        playerCount: 10,
      }),
    ).toBe(false)
  })

  it('is true when shuffle or moves or closures exist', () => {
    expect(
      venueSeatingAnnouncementHasContent({
        moves: [],
        closedTableNums: [],
        shuffled: true,
        tablesBefore: 20,
        tablesAfter: 18,
        playerCount: 110,
      }),
    ).toBe(true)
    expect(
      venueSeatingAnnouncementHasContent({
        moves: [{ name: 'Pat', fromTableNum: 2, toTableNum: 5 }],
        closedTableNums: [2],
        shuffled: false,
        tablesBefore: 3,
        tablesAfter: 2,
        playerCount: 10,
      }),
    ).toBe(true)
  })
})
