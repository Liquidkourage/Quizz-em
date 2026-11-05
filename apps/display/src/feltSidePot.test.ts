import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { VenueAerialFloorGrid, VenueSingleTableBroadcast } from './VenueEightTablesPreview'
import { resolveVenueFloorSpec } from './venueFloorSpec'

function tile(tableNum: number, extra: Partial<DisplayVenueTileSnapshot> = {}): DisplayVenueTileSnapshot {
  return {
    tableNum,
    seated: 6,
    pot: 5020,
    phase: 'betting',
    seatNames: ['Elena B.', 'Blake C.', 'Liam A.', 'Hugo C.', 'Liam B.', 'Priya B.'],
    seatInvested: [1000, 1000, 1000, 1000, 1000, 20],
    seatFolded: [false, false, false, false, false, true],
    ...extra,
  }
}

describe('felt side pot', () => {
  it('shows the main pot and marks who can win the side pot on the one-table felt', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSingleTableBroadcast, {
        tile: tile(1),
        prefersReducedMotion: true,
      }),
    )
    expect(html).toContain('pot $120')
    expect(html).toContain('$120')
    expect(html).not.toContain('of which')
    expect(html).not.toContain('5,020')
    expect(html).not.toContain('4,900')
  })

  it('shows the main pot and a superscript on mosaic initials', () => {
    const spec = resolveVenueFloorSpec({ populatedTableCount: 4 })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: [tile(1), tile(2, { pot: 0, seatInvested: [], seatFolded: [] }), tile(3, { pot: 0, seatInvested: [], seatFolded: [] }), tile(4, { pot: 0, seatInvested: [], seatFolded: [] })],
        floorSpec: spec!,
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
      }),
    )
    const start = html.indexOf('data-table-tile="1"')
    const card = html.slice(start, html.indexOf('data-table-tile="2"'))
    expect(card).toContain('pot $120')
    expect(card).toContain('$120')
    expect(card).not.toContain('of which')
    expect(card).not.toContain('5,020')
  })
})
