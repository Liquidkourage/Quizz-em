import { describe, expect, it } from 'vitest'
import {
  payoutSeatChangesToAnnounce,
  venueSeatingAnnouncementHasContent,
} from './useVenueSeatingAnnouncement'
import { handHasPayoutBusts } from './useVenueBustAnnouncement'

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

describe('payout announcements', () => {
  it('pops eliminations when a hand has just paid', () => {
    expect(handHasPayoutBusts(null)).toBe(false)
    expect(handHasPayoutBusts({ lastHandEndMs: 10, lastHandBusts: [] })).toBe(false)
    expect(
      handHasPayoutBusts({
        lastHandEndMs: 10,
        lastHandBusts: [{ name: 'Ada Lane', tableNum: 2 }],
      }),
    ).toBe(true)
  })

  it('pops named table moves and leaves a global re-seat off the card', () => {
    expect(
      payoutSeatChangesToAnnounce({
        moves: [],
        closedTableNums: [3, 4],
        shuffled: true,
        tablesBefore: 4,
        tablesAfter: 2,
        playerCount: 12,
      }),
    ).toBeNull()
    expect(
      payoutSeatChangesToAnnounce({
        moves: [{ name: 'Pat', fromTableNum: 2, toTableNum: 5 }],
        closedTableNums: [2, 3, 4],
        shuffled: true,
        tablesBefore: 4,
        tablesAfter: 2,
        playerCount: 12,
      }),
    ).toEqual({
      moves: [{ name: 'Pat', fromTableNum: 2, toTableNum: 5 }],
      closedTableNums: [],
      shuffled: false,
      tablesBefore: 4,
      tablesAfter: 2,
      playerCount: 12,
    })
    expect(
      payoutSeatChangesToAnnounce({
        moves: [{ name: 'Pat', fromTableNum: 2, toTableNum: 5 }],
        closedTableNums: [2],
        shuffled: false,
        tablesBefore: 3,
        tablesAfter: 2,
        playerCount: 10,
      })?.closedTableNums,
    ).toEqual([2])
  })
})
