import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { VenueDualTableBroadcast } from './VenueEightTablesPreview'
import { resolveVenueFloorSpec } from './venueFloorSpec'

function tile(tableNum: number): DisplayVenueTileSnapshot {
  return {
    tableNum,
    seated: 4,
    pot: 200,
    phase: 'question',
    seatNames: ['Ada Lane', 'Bo Kent', 'Cara Moss', 'Dee Park', '', '', '', ''],
  }
}

describe('two-table broadcast frame', () => {
  it('draws a card border around each two-table felt', () => {
    const html = renderToStaticMarkup(
      createElement(VenueDualTableBroadcast, {
        tiles: [tile(1), tile(2)],
        prefersReducedMotion: true,
        floorSpec: resolveVenueFloorSpec({ populatedTableCount: 2 }) ?? undefined,
      }),
    )
    expect(html).toContain('venue-floor-dual-broadcast')
    expect(html.match(/border-yellow-700\/40/g)?.length).toBe(2)
    expect(html).not.toContain('data-table-tile')
  })
})
