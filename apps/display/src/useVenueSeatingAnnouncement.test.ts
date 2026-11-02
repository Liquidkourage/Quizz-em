import { describe, expect, it } from 'vitest'
import {
  normalizeLastHandSeating,
  payoutBustsShareTheSeatingCard,
  payoutSeatChangesToAnnounce,
  seatingOverlayDurationMs,
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

  it('shows a dropped table from a redraw', () => {
    expect(
      payoutSeatChangesToAnnounce({
        moves: [],
        closedTableNums: [3, 4],
        shuffled: true,
        tablesBefore: 4,
        tablesAfter: 2,
        playerCount: 12,
      })?.closedTableNums,
    ).toEqual([3, 4])
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
      closedTableNums: [2, 3, 4],
      shuffled: true,
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

  it('keeps the reason on each move the TV is about to show', () => {
    const seating = normalizeLastHandSeating({
      moves: [
        {
          name: 'Elena G.',
          fromTableNum: 1,
          toTableNum: 2,
          byline: 'TABLE REDUCTION',
        },
      ],
      closedTableNums: [1],
      shuffled: false,
      tablesBefore: 6,
      tablesAfter: 5,
      playerCount: 20,
    })
    expect(seating?.moves[0]?.byline).toBe('TABLE REDUCTION')
  })

  it('keeps eliminations on the seating card when that hand also moved players', () => {
    const seating = {
      moves: [{ name: 'Pat', fromTableNum: 2, toTableNum: 5 }],
      closedTableNums: [] as number[],
      shuffled: false,
      tablesBefore: 3,
      tablesAfter: 3,
      playerCount: 10,
    }
    expect(payoutBustsShareTheSeatingCard(seating)).toBe(true)
    expect(payoutBustsShareTheSeatingCard(null)).toBe(false)
    expect(
      seatingOverlayDurationMs(seating, false, 1),
    ).toBe(5210)
    expect(seatingOverlayDurationMs(seating, false, 0)).toBe(4600)
  })
})
