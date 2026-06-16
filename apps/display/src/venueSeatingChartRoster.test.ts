import { describe, expect, it } from 'vitest'
import type { VenueSeatingChartTable } from './venueWallModel'
import {
  SEATING_CHART_ROSTER_PAGE_SIZE,
  seatingChartPlayerEntries,
  seatingChartRosterBucket,
  seatingChartRosterHalves,
  seatingChartRosterPageCount,
  seatingChartRosterPageEntries,
} from './venueSeatingChartRoster'

const sampleTables: VenueSeatingChartTable[] = [
  {
    tableNum: 2,
    seats: [
      { seatNum: 1, name: 'Zed A.', bankroll: 0 },
      { seatNum: 2, name: 'Alice C.', bankroll: 0 },
    ],
  },
  {
    tableNum: 1,
    seats: [{ seatNum: 1, name: 'Noah H.', bankroll: 0 }],
  },
]

describe('seatingChartPlayerEntries', () => {
  it('flattens and sorts alphabetically by name', () => {
    expect(seatingChartPlayerEntries(sampleTables)).toEqual([
      { name: 'Alice C.', tableNum: 2, seatNum: 2 },
      { name: 'Noah H.', tableNum: 1, seatNum: 1 },
      { name: 'Zed A.', tableNum: 2, seatNum: 1 },
    ])
  })
})

describe('seatingChartRosterBucket', () => {
  it('splits A–M and N–Z by first letter', () => {
    expect(seatingChartRosterBucket('Alice C.')).toBe('am')
    expect(seatingChartRosterBucket('Martin K.')).toBe('am')
    expect(seatingChartRosterBucket('Noah H.')).toBe('nz')
    expect(seatingChartRosterBucket('Zed A.')).toBe('nz')
  })
})

describe('seatingChartRosterHalves', () => {
  it('partitions sorted entries', () => {
    const entries = seatingChartPlayerEntries(sampleTables)
    expect(seatingChartRosterHalves(entries)).toEqual({
      am: [{ name: 'Alice C.', tableNum: 2, seatNum: 2 }],
      nz: [
        { name: 'Noah H.', tableNum: 1, seatNum: 1 },
        { name: 'Zed A.', tableNum: 2, seatNum: 1 },
      ],
    })
  })
})

describe('seatingChartRosterPageEntries', () => {
  it('pages long rosters', () => {
    const total = SEATING_CHART_ROSTER_PAGE_SIZE + 8
    const entries = Array.from({ length: total }, (_, i) => ({
      name: `Player ${i}`,
      tableNum: 1,
      seatNum: 1,
    }))
    expect(seatingChartRosterPageCount(entries.length)).toBe(2)
    expect(seatingChartRosterPageEntries(entries, 0)).toHaveLength(SEATING_CHART_ROSTER_PAGE_SIZE)
    expect(seatingChartRosterPageEntries(entries, 1)).toHaveLength(total - SEATING_CHART_ROSTER_PAGE_SIZE)
  })
})
