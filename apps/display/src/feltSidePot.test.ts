import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  MosaicSeatFace,
  MosaicSidePotPlaques,
  VenueAerialFloorGrid,
  VenueSingleTableBroadcast,
  mosaicChipInlay,
  mosaicSeatIsAllIn,
  mosaicSidePotsThatFit,
} from './VenueEightTablesPreview'
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
    expect(card).not.toContain('vfd-mosaic-side-plaque')
    expect(card).not.toContain('vfd-mosaic-side-badge')
    expect(card).not.toContain('>Folded<')
    expect(card).not.toContain('>Main<')
    expect(card).not.toContain('vfd-felt-side-pot')
    expect(card).not.toContain('side-pot-mark')
    expect(card).not.toContain('of which')
  })

  it('shows a chip plaque per side pot and a matching badge on each eligible seat', () => {
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
    expect(card).toContain('vfd-mosaic-side-plaque-face')
    expect(card).toContain('aria-label="Side pot 1 $800"')
    expect(card).toContain('aria-label="Side pot 2 $600"')
    expect(card).toContain('>Side pot 1<')
    expect(card).toContain('>Side pot 2<')
    expect(card).not.toContain('side-pot-mark')
    expect(card).not.toContain('vfd-mosaic-side-footer')
    expect(card).not.toContain('>Main<')
    expect(card).not.toContain('vfd-felt-side-pot')
  })

  it('draws one plaque when the hand has one side pot and none when it has zero', () => {
    const one = renderToStaticMarkup(
      createElement(MosaicSidePotPlaques, { sides: [{ mark: 1, amount: 40 }] }),
    )
    expect(one).toContain('aria-label="Side pot 1 $40"')
    expect(one).not.toContain('Side pot 2')
    const none = renderToStaticMarkup(createElement(MosaicSidePotPlaques, { sides: [] }))
    expect(none).toBe('')
  })

  it('puts matching chips on eligible seats and a status pill on folded or all-in seats', () => {
    const both = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'NB', marks: [1, 2], folded: false, allIn: false }),
    )
    expect(both).toContain('>NB<')
    expect(both).toContain('aria-label="Side pot 1"')
    expect(both).toContain('aria-label="Side pot 2"')
    expect(both).toContain('--vfd-side-pot:#7dd3fc')
    expect(both).toContain('--vfd-side-pot:#ea580c')
    expect(both.indexOf('aria-label="Side pot 1"')).toBeLessThan(both.indexOf('>NB<'))
    const rightRail = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'BB', marks: [1, 2], folded: false, allIn: true, seatIndex: 2 }),
    )
    expect(rightRail.indexOf('>All-in<')).toBeLessThan(rightRail.indexOf('>BB<'))
    expect(rightRail.indexOf('>BB<')).toBeLessThan(rightRail.indexOf('aria-label="Side pot 1"'))
    expect(rightRail).toContain('vfd-mosaic-seat-face--status-above')
    expect(both).not.toContain('>Folded<')
    expect(both).not.toContain('>All-in<')

    const mainOnly = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'LA', marks: [], folded: false, allIn: true }),
    )
    expect(mainOnly).not.toContain('vfd-mosaic-side-badge')
    expect(mainOnly).toContain('>All-in<')
    expect(mainOnly).not.toContain('vfd-mosaic-seat-initial--folded')

    const folded = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'PA', marks: [], folded: true, allIn: true }),
    )
    expect(folded).toContain('vfd-mosaic-seat-initial--folded')
    expect(folded).toContain('>Folded<')
    expect(folded).not.toContain('>All-in<')

    expect(mosaicSeatIsAllIn({
      stacksKnown: true,
      bankroll: 0,
      invested: 950,
      folded: false,
      pointsOnly: false,
    })).toBe(true)
    expect(mosaicSeatIsAllIn({
      stacksKnown: true,
      bankroll: 70,
      invested: 1060,
      folded: false,
      pointsOnly: false,
    })).toBe(false)
    expect(mosaicSeatIsAllIn({
      stacksKnown: false,
      bankroll: 0,
      invested: 950,
      folded: false,
      pointsOnly: false,
    })).toBe(false)
  })

  it('spaces side-pot inlays evenly along one closed stadium rim', () => {
    const inlay = mosaicChipInlay()
    const [dash, gap] = inlay.dasharray.split(' ').map(Number)
    const perimeter = 2 * 140 + 2 * Math.PI * 39
    expect(inlay.count * (dash + gap)).toBeCloseTo(perimeter, 1)
    expect(inlay.d).toContain('A ')
    expect(inlay.d.trim().endsWith('Z')).toBe(true)
    const html = renderToStaticMarkup(
      createElement(MosaicSidePotPlaques, { sides: [{ mark: 1, amount: 600 }] }),
    )
    expect(html).toContain(`stroke-dasharray="${inlay.dasharray}"`)
    expect(html).not.toContain('rotate(')
  })

  it('keeps only the side pots that fit on one mosaic row', () => {
    expect(mosaicSidePotsThatFit(3, 0)).toBe(3)
    expect(mosaicSidePotsThatFit(3, 160)).toBe(1)
    expect(mosaicSidePotsThatFit(3, 340)).toBe(2)
    expect(mosaicSidePotsThatFit(3, 520)).toBe(3)
    expect(mosaicSidePotsThatFit(2, 100)).toBe(0)
  })
})
