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
    expect(html).toContain('main $120, side 1 $4,900')
    expect(html).toContain('$120')
    expect(html).toContain('aria-label="$4,900"')
    expect(html).toContain('>Main<')
    expect(html).toContain('>Side<')
    expect(html).toContain('<sup class="side-pot-mark" style="font-size:0.55em;line-height:1;color:#38bdf8">1</sup>')
    expect(html).toContain('style="color:#38bdf8"')
    expect(html).not.toContain('of which')
    expect(html).not.toContain('5,020')
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
    expect(card).toContain('main $120, side 1 $4,900')
    expect(card).toContain('$120')
    expect(card).toContain('vfd-mosaic-side-footer')
    expect(card).toContain('repeat(1, minmax(0, 1fr))')
    expect(card).toContain('aria-label="$4,900"')
    expect(card).toContain('>Side<')
    expect(card).not.toContain('>Main<')
    expect(card).not.toContain('vfd-mosaic-pot-sides')
    expect(card).not.toContain('vfd-felt-side-pot')
    expect(card).toContain('<sup class="side-pot-mark" style="font-size:0.55em;line-height:1;color:#38bdf8">1</sup>')
    expect(card).toContain('style="color:#38bdf8"')
    expect(card).not.toContain('of which')
    expect(card).not.toContain('5,020')
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
    expect(card).not.toContain('vfd-felt-side-pot')
  })
})
