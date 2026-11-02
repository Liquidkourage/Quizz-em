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
    expect(html).toContain('animation-duration:6500ms')
  })
})
