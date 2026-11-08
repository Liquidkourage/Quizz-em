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
            seatBankrolls: [0, 0, 0, 400, 400],
            isBettingOpen: true,
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
    expect(card).toContain('vfd-mosaic-side-plaque-mark')
    expect(card).not.toContain('>Side pot 1<')
    expect(card).not.toContain('>Side pot 2<')
    expect(card).toContain('>800<')
    expect(card).toContain('>600<')
    expect(card).not.toContain('side-pot-mark')
    expect(card).not.toContain('vfd-mosaic-side-footer')
    expect(card).not.toContain('>Main<')
    expect(card).not.toContain('vfd-felt-side-pot')
  })

  it('keeps an unmatched raise in the one pot while the short stack can still call', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSingleTableBroadcast, {
        tile: tile(1, {
          pot: 700,
          seatInvested: [100, 300, 300],
          seatFolded: [false, false, false],
          seatBankrolls: [400, 200, 200],
        }),
        prefersReducedMotion: true,
      }),
    )
    expect(html).toContain('pot $700')
    expect(html).not.toContain('vfd-mosaic-side-plaque')
    expect(html).not.toContain('Side pot')
  })

  it('docks the final table side pots to the bottom corners of the table', () => {
    const html = renderToStaticMarkup(
      createElement(VenueSingleTableBroadcast, {
        tile: tile(1, {
          pot: 1900,
          seatInvested: [100, 300, 300, 600, 600],
          seatFolded: [false, false, false, false, false],
          seatBankrolls: [0, 0, 0, 400, 400],
          isBettingOpen: true,
        }),
        prefersReducedMotion: true,
      }),
    )
    expect(html).toContain('vfd-mosaic-side-lane--corners')
    expect(html).toContain('vfd-mosaic-side-plaque--left')
    expect(html).toContain('vfd-mosaic-side-plaque--right')
    expect(html).toContain('aria-label="Side pot 1 $800"')
    expect(html).toContain('aria-label="Side pot 2 $600"')
    expect(html).not.toContain('vfd-felt-side-pot')
    expect(html).not.toContain('>Main<')
  })

  it('docks one side pot to the bottom left and the second to the bottom right', () => {
    const one = renderToStaticMarkup(
      createElement(MosaicSidePotPlaques, { sides: [{ mark: 1, amount: 40 }] }),
    )
    expect(one).toContain('vfd-mosaic-side-plaque--left')
    expect(one).not.toContain('vfd-mosaic-side-plaque--right')
    const two = renderToStaticMarkup(
      createElement(MosaicSidePotPlaques, {
        sides: [
          { mark: 1, amount: 40 },
          { mark: 2, amount: 80 },
        ],
      }),
    )
    expect(two).toContain('vfd-mosaic-side-plaque--left')
    expect(two).toContain('vfd-mosaic-side-plaque--right')
    expect(two).not.toContain('+')
    const three = renderToStaticMarkup(
      createElement(MosaicSidePotPlaques, {
        sides: [
          { mark: 1, amount: 40 },
          { mark: 2, amount: 80 },
          { mark: 3, amount: 120 },
        ],
      }),
    )
    expect(three).toContain('Side pot 1 $40')
    expect(three).not.toContain('Side pot 2')
    expect(three).toContain('+2 MORE')
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
      createElement(MosaicSeatFace, { initials: 'NB', marks: [1, 2], folded: false }),
    )
    expect(both).toContain('>NB<')
    expect(both).toContain('aria-label="Side pot 1"')
    expect(both).toContain('aria-label="Side pot 2"')
    expect(both).toContain('--vfd-side-pot:#7dd3fc')
    expect(both).toContain('--vfd-side-pot:#ea580c')
    expect(both.indexOf('>NB<')).toBeLessThan(both.indexOf('aria-label="Side pot 1"'))
    expect(both.indexOf('aria-label="Side pot 1"')).toBeLessThan(both.indexOf('aria-label="Side pot 2"'))
    expect(both).toContain('vfd-mosaic-seat-face--bottom')
    const rightRail = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'BB', marks: [1, 2], folded: false, seatIndex: 2 }),
    )
    expect(rightRail).toContain('vfd-mosaic-seat-face--right')
    expect(rightRail).not.toContain('>All-in<')
    expect(rightRail.indexOf('aria-label="Side pot 1"')).toBeLessThan(rightRail.indexOf('>BB<'))
    const leftRail = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'EA', marks: [], folded: true, seatIndex: 6 }),
    )
    expect(leftRail).toContain('vfd-mosaic-seat-face--left')
    expect(leftRail).toContain('vfd-mosaic-seat-folded--inward')
    expect(leftRail).toContain('>Folded<')
    expect(both).not.toContain('>Folded<')
    expect(both).not.toContain('>All-in<')

    const mainOnly = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'LA', marks: [], folded: false }),
    )
    expect(mainOnly).not.toContain('vfd-mosaic-side-badge')
    expect(mainOnly).not.toContain('>All-in<')
    expect(mainOnly).not.toContain('vfd-mosaic-seat-initial--folded')

    const folded = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'PA', marks: [], folded: true }),
    )
    expect(folded).toContain('vfd-mosaic-seat-initial--folded')
    expect(folded).toContain('vfd-mosaic-seat-folded--above')
    expect(folded).toContain('>Folded<')
    expect(folded).not.toContain('>All-in<')
    const topFolded = renderToStaticMarkup(
      createElement(MosaicSeatFace, { initials: 'AA', marks: [], folded: true, seatIndex: 0 }),
    )
    expect(topFolded).toContain('vfd-mosaic-seat-folded--below')

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

  it('sets three radial inlays on each semicircular end', () => {
    const rim = mosaicChipInlay()
    const right = rim.sectors.filter((sector) => sector.cx === 190)
    const left = rim.sectors.filter((sector) => sector.cx === 50)
    expect(right.map((sector) => (sector.a0 + sector.a1) / 2)).toEqual([-60, 0, 60])
    expect(left.map((sector) => (sector.a0 + sector.a1) / 2)).toEqual([120, 180, 240])
    expect(new Set(rim.sectors.map((sector) => sector.a1 - sector.a0))).toEqual(new Set([28]))
    for (const sector of rim.sectors) {
      expect(sector.d).toContain(`A ${rim.outer}`)
      expect(sector.d).toContain(`A ${rim.inner}`)
      expect(sector.d.endsWith('Z')).toBe(true)
    }
    const top = rim.straights.filter((bar) => bar.y < 50)
    expect(top).toHaveLength(4)
    const gaps = top.slice(1).map((bar, index) => bar.x - (top[index].x + top[index].w))
    expect(gaps[0]).toBeCloseTo(gaps[1], 2)
    const html = renderToStaticMarkup(
      createElement(MosaicSidePotPlaques, { sides: [{ mark: 1, amount: 600 }] }),
    )
    expect(html).toContain('clip-path="url(#')
    expect(html).not.toContain('stroke-dasharray')
  })

  it('keeps only the side pots that fit on one mosaic row', () => {
    expect(mosaicSidePotsThatFit(3, 0)).toBe(3)
    expect(mosaicSidePotsThatFit(2, 100, 80)).toBe(0)
    expect(mosaicSidePotsThatFit(3, 900, 720)).toBe(3)
    const crowded = renderToStaticMarkup(
      createElement(MosaicSidePotPlaques, {
        sides: [{ mark: 1, amount: 40 }],
        hiddenCount: 2,
        metrics: { widthPx: 72, heightPx: 29, gapPx: 4 },
      }),
    )
    expect(crowded).toContain('+2 MORE')
    expect(crowded).toContain('2 more side pots')
    expect(crowded).not.toContain('>Side pot 1<')
    expect(crowded).toContain('40')
  })
})
