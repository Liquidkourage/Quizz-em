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
    expect(rows).toBe(2)
    expect(html.indexOf('>Eliminated<')).toBeLessThan(html.indexOf('Ada'))
    const line = html.slice(html.indexOf('Ada'), html.indexOf('Ada') + 700)
    expect(line).toContain('Table 2 → Table 1')
    expect(line).toContain('TABLE BALANCE')
    expect(html).toContain('venue-seating-update')
    expect(html).toContain('repeat(1, minmax(0, 1fr))')
    expect(html).toContain('max-w-[min(72rem,92vw)]')
    expect(html).not.toContain('max-width:none')
  })

  it('says the tables were renumbered when the packed number matches the old one', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 4,
          tablesAfter: 3,
          playerCount: 8,
          moves: [
            {
              name: 'Ada Lane',
              fromTableNum: 1,
              toTableNum: 1,
              renumberedFromTableNum: 4,
              byline: 'TABLE BALANCE',
            },
          ],
          closedTableNums: [],
        },
        busts: [],
      }),
    )
    expect(html).toContain('Table 1 → Table 1 · was table 4 before tables were renumbered')
  })

  it('splits a crowded seating update across more columns', () => {
    const moves = Array.from({ length: 12 }, (_, i) => ({
      name: i === 0 ? 'Maximilian Westerly' : `Player ${i}`,
      fromTableNum: (i % 11) + 1,
      toTableNum: 1,
      byline: 'TABLE REDUCTION',
    }))
    const busts = Array.from({ length: 12 }, (_, i) => ({
      name: `Busted ${i}`,
      tableNum: (i % 11) + 1,
    }))
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 11,
          tablesAfter: 6,
          playerCount: 24,
          moves,
          closedTableNums: [],
        },
        busts,
      }),
    )
    expect(html).toContain('repeat(6, minmax(0, 1fr))')
    expect(html.indexOf('Busted 0')).toBeLessThan(html.indexOf('Maximilian W.'))
    expect(html).toContain('venue-bust-overlay-panel--compact')
    expect(html).toContain('Maximilian W.')
    expect(html).toContain('TABLE REDUCTION')
  })

  it('keeps a long name and its initial on the seating line', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 4,
          tablesAfter: 3,
          playerCount: 8,
          moves: [
            {
              name: 'Maximilian Westerly',
              fromTableNum: 12,
              toTableNum: 3,
              byline: 'TABLE BALANCE',
            },
          ],
          closedTableNums: [],
        },
        busts: [{ name: 'Maximilian Westerly', tableNum: 12 }],
      }),
    )
    const line = html.slice(
      html.indexOf('venue-bust-overlay-row-line'),
      html.indexOf('venue-bust-overlay-row-line') + 800,
    )
    expect(line).toContain('Maximilian W.')
    expect(line).toContain('venue-seating-name')
  })

  it('lists people who left a closed table underneath that table', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 6,
          tablesAfter: 4,
          playerCount: 16,
          moves: [
            { name: 'Ada Lane', fromTableNum: 2, toTableNum: 5, byline: 'TABLE BALANCE' },
            { name: 'Cam Diaz', fromTableNum: 4, toTableNum: 1, byline: 'TABLE REDUCTION' },
            { name: 'Eve Hart', fromTableNum: 4, toTableNum: 1, byline: 'TABLE REDUCTION' },
            { name: 'Pat Mills', fromTableNum: 9, toTableNum: 2, byline: 'TABLE REDUCTION' },
          ],
          closedTableNums: [4, 9],
        },
        busts: [
          { name: 'Bo Kent', tableNum: 3 },
          { name: 'Eve Hart', tableNum: 4 },
        ],
      }),
    )
    const at = (label: string) => html.indexOf(label)
    expect(at('Bo K.')).toBeGreaterThan(-1)
    expect(at('Bo K.')).toBeLessThan(at('>Table 4<'))
    expect(at('>Table 4<')).toBeLessThan(at('Cam D.'))
    expect(at('Cam D.')).toBeLessThan(at('>Table 9<'))
    expect(at('>Table 9<')).toBeLessThan(at('Pat M.'))
    expect(at('Pat M.')).toBeLessThan(at('Ada L.'))
    const under4 = html.indexOf('venue-seating-closure-moves', html.indexOf('>Table 4<'))
    expect(html.slice(under4, under4 + 600)).toContain('Cam D.')
    expect(html.slice(under4, under4 + 600)).not.toContain('Ada L.')
    expect(html.split('Eve H.').length - 1).toBe(1)
    expect(at('Eve H.')).toBeLessThan(at('>Table 4<'))
  })

  it('colors an elimination apart from a move', () => {
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
    const moveAt = html.indexOf('venue-bust-overlay-row--move')
    const boAt = html.indexOf('Bo K.')
    expect(moveAt).toBeGreaterThan(-1)
    expect(boAt).toBeGreaterThan(-1)
    expect(html.slice(moveAt, moveAt + 500)).toContain('Ada')
    expect(html.slice(boAt - 400, boAt)).toContain('venue-bust-overlay-row--eliminated')
    expect(html.indexOf('>Eliminated<')).toBeLessThan(boAt)
    expect(html.slice(moveAt, moveAt + 80)).not.toContain('venue-bust-overlay-row--eliminated')
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
    expect(html).toContain('Eliminated')
    expect(html).toContain('venue-seating-closure-moves')
    expect(html).toContain('Ada')
    expect(html).toContain('TABLE BALANCE')
    expect(html).toContain('1 eliminated')
    expect(html).toContain('animation-duration:5210ms')
  })

  it('lays a crowded update across the screen so every row can fit', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSeatingAnnouncement, {
        seating: {
          shuffled: false,
          tablesBefore: 8,
          tablesAfter: 6,
          playerCount: 40,
          moves: [
            { name: 'Kim D', fromTableNum: 6, toTableNum: 1, byline: 'TABLE REDUCTION' },
            { name: 'Liam D', fromTableNum: 6, toTableNum: 3, byline: 'TABLE REDUCTION' },
            { name: 'Maria D', fromTableNum: 6, toTableNum: 4, byline: 'TABLE REDUCTION' },
            { name: 'Priya D', fromTableNum: 6, toTableNum: 1, byline: 'TABLE REDUCTION' },
            { name: 'Elena E', fromTableNum: 7, toTableNum: 4, byline: 'TABLE REDUCTION' },
            { name: 'Grace B', fromTableNum: 7, toTableNum: 2, byline: 'TABLE REDUCTION' },
          ],
          closedTableNums: [6, 7],
        },
        busts: [
          { name: 'Kim B', tableNum: 4 },
          { name: 'Liam B', tableNum: 4 },
          { name: 'Noah B', tableNum: 4 },
          { name: 'Noah D', tableNum: 6 },
          { name: 'Alice E', tableNum: 6 },
        ],
      }),
    )
    expect(html).toContain('repeat(5, minmax(0, 1fr))')
    expect(html).toContain('venue-seating-closures')
    expect(html).toContain('venue-seating-update--fill')
    expect(html).toContain('min-h-0')
    expect(html).toContain('Grace B.')
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
