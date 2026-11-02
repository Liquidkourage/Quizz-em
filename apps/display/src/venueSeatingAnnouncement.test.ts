import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueSeatingAnnouncement from './VenueSeatingAnnouncement'

describe('seating update', () => {
  it('colors a closed table differently from a player who moved', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 4,
          tablesAfter: 3,
          playerCount: 8,
          moves: [{ name: 'Ada Lane', fromTableNum: 2, toTableNum: 1 }],
          closedTableNums: [4],
        },
      }),
    )
    const moved = html.indexOf('Ada')
    const closed = html.indexOf('Table 4')
    expect(moved).toBeGreaterThan(-1)
    expect(closed).toBeGreaterThan(-1)
    expect(html.slice(closed - 180, closed)).toContain('venue-bust-overlay-row--closed')
    expect(html.slice(moved - 180, moved)).not.toContain('venue-bust-overlay-row--closed')
  })

  it('explains why each player moved', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 4,
          tablesAfter: 4,
          playerCount: 8,
          moves: [
            {
              name: 'Ada Lane',
              fromTableNum: 9,
              toTableNum: 4,
              byline: 'TABLE BALANCE',
            },
          ],
          closedTableNums: [],
        },
      }),
    )
    expect(html).toContain('venue-bust-overlay-byline')
    expect(html).toContain('TABLE BALANCE')
  })

  it('labels a dropped table with the line that emptied it', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 2,
          tablesAfter: 1,
          playerCount: 5,
          moves: [
            {
              name: 'Ada Lane',
              fromTableNum: 4,
              toTableNum: 1,
              byline: 'TABLE REDUCTION',
            },
          ],
          closedTableNums: [4],
        },
      }),
    )
    const closed = html.indexOf('>Table 4<')
    expect(closed).toBeGreaterThan(-1)
    expect(html.slice(closed, closed + 400)).toContain('TABLE REDUCTION')
  })

  it('labels a table dropped by a redraw TABLE SHUFFLE', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: true,
          tablesBefore: 4,
          tablesAfter: 2,
          playerCount: 12,
          moves: [],
          closedTableNums: [9],
        },
      }),
    )
    const closed = html.indexOf('>Table 9<')
    expect(closed).toBeGreaterThan(-1)
    expect(html.slice(closed, closed + 400)).toContain('TABLE SHUFFLE')
  })

  it('shows a circle for how long the seating update stays up', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 4,
          tablesAfter: 3,
          playerCount: 8,
          moves: [{ name: 'Ada Lane', fromTableNum: 2, toTableNum: 1 }],
          closedTableNums: [],
        },
      }),
    )
    expect(html).toContain('seating-chart-clock-value')
    expect(html).toContain('animation-duration:4600ms')
  })
})
