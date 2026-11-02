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

  it('puts an elimination on the same row as that player’s move', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 4,
          tablesAfter: 3,
          playerCount: 8,
          moves: [{ name: 'Ada Lane', fromTableNum: 2, toTableNum: 1, byline: 'TABLE BALANCE' }],
          closedTableNums: [],
        },
        busts: [{ name: 'Ada Lane', tableNum: 2 }],
      }),
    )
    const rows = html.split('venue-bust-overlay-row ').length - 1
    expect(rows).toBe(1)
    const line = html.slice(html.indexOf('venue-bust-overlay-row-line'), html.indexOf('venue-bust-overlay-row-line') + 700)
    expect(line).toContain('Ada')
    expect(line).toContain('ELIMINATED')
    expect(line).toContain('Table 2 → Table 1')
    expect(line).toContain('TABLE BALANCE')
    expect(html).toContain('venue-seating-update')
    expect(html).toContain('repeat(1, minmax(0, 1fr))')
  })

  it('lists eliminations on the same card as the moves', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 4,
          tablesAfter: 3,
          playerCount: 8,
          moves: [{ name: 'Ada Lane', fromTableNum: 2, toTableNum: 1, byline: 'TABLE BALANCE' }],
          closedTableNums: [],
        },
        busts: [{ name: 'Bo Kent', tableNum: 3 }],
      }),
    )
    expect(html).toContain('Bo')
    expect(html).toContain('ELIMINATED')
    expect(html).toContain('Ada')
    expect(html).toContain('TABLE BALANCE')
    expect(html).toContain('1 eliminated')
    expect(html).toContain('animation-duration:5210ms')
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
