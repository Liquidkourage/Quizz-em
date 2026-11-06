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
  it('keeps a folded short stack inside the one pot everyone still in can win', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSingleTableBroadcast, {
        tile: tile(1),
        prefersReducedMotion: true,
      }),
    )
    expect(html).toContain('pot $5,020')
    expect(html).toContain('$5,020')
    expect(html).not.toContain('>Main<')
    expect(html).not.toContain('>Side<')
    expect(html).not.toContain('side-pot-mark')
    expect(html).not.toContain('of which')
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
    expect(card).toContain('pot $5,020')
    expect(card).toContain('$5,020')
    expect(card).not.toContain('vfd-mosaic-side-footer')
    expect(card).not.toContain('>Side<')
    expect(card).not.toContain('>Main<')
    expect(card).not.toContain('vfd-mosaic-pot-sides')
    expect(card).not.toContain('vfd-felt-side-pot')
    expect(card).not.toContain('side-pot-mark')
    expect(card).not.toContain('of which')
  })

  it('gives each side pot its own footer column', () => {
    const spec = resolveVenueFloorSpec({ populatedTableCount: 2 })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: [
          tile(1, {
            pot: 1900,
            seatInvested: [100, 300, 300, 600, 600],
            seatFolded: [false, false, false, false, false],
          }),
          tile(2, { pot: 0, seatInvested: [], seatFolded: [] }),
        ],
        floorSpec: spec!,
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
      }),
    )
    const card = html.slice(html.indexOf('data-table-tile="1"'), html.indexOf('data-table-tile="2"'))
    expect(card).toContain('repeat(2, minmax(0, 1fr))')
    expect(card).toContain('aria-label="$800"')
    expect(card).toContain('aria-label="$600"')
    expect(card).toContain('color:#7dd3fc')
    expect(card).toContain('color:#ea580c')
    expect(card).not.toContain('vfd-felt-side-pot')
  })
})
