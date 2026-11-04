import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { VenueAerialFloorGrid, VenueSingleTableBroadcast } from './VenueEightTablesPreview'
import { resolveVenueFloorSpec } from './venueFloorSpec'

function tile(tableNum: number, extra: Partial<DisplayVenueTileSnapshot> = {}): DisplayVenueTileSnapshot {
  return {
    tableNum,
    seated: 3,
    pot: 850,
    phase: 'betting',
    seatNames: ['Ada', 'Bo', 'Cara'],
    ...extra,
  }
}

describe('felt side pot', () => {
  it('prints the side amount on the one-table public felt', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSingleTableBroadcast, {
        tile: tile(1, { sidePot: 300 }),
        prefersReducedMotion: true,
      }),
    )
    expect(html).toContain('Side')
    expect(html).toContain('300')
    expect(html).toContain('side $300')
  })

  it('prints the side amount on a mosaic felt', () => {
    const spec = resolveVenueFloorSpec({ populatedTableCount: 4 })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: [tile(1, { sidePot: 300 }), tile(2), tile(3), tile(4)],
        floorSpec: spec!,
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
      }),
    )
    const start = html.indexOf('data-table-tile="1"')
    const card = html.slice(start, html.indexOf('data-table-tile="2"'))
    expect(card).toContain('Side')
    expect(card).toContain('300')
  })
})
