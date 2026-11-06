import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { VenueDualTableBroadcast } from './VenueEightTablesPreview'
import { VenueFloorBody } from './VenueFloorBody'
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

describe('one-table floor', () => {
  it('draws the final table with the same mosaic card as the two-table floor', () => {
    const html = renderToStaticMarkup(
      createElement(VenueFloorBody, {
        floorSpec: resolveVenueFloorSpec({ populatedTableCount: 1 }),
        floorTiles: [
          {
            ...tile(1),
            phase: 'betting',
            pot: 1900,
            seatInvested: [100, 300, 300, 600, 600],
            seatFolded: [false, false, false, false, false],
            seatBankrolls: [0, 0, 0, 400, 400],
            isBettingOpen: true,
            actingSeatIndex: 0,
            actingCallAmount: 40,
          },
        ],
        showHeroSpotlight: false,
        hostFocusTable: null,
        featuredTile: null,
        companionTiles: [],
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
      }),
    )
    expect(html).toContain('data-table-tile="1"')
    expect(html).toContain('vfd-mosaic-table-num')
    expect(html).toContain('vfd-mosaic-status-band--call')
    expect(html).toContain('Ada L. to call $40')
    expect(html).toContain('vfd-mosaic-side-plaque--left')
    expect(html).toContain('vfd-mosaic-side-plaque--right')
    expect(html).not.toContain('venue-single-table-broadcast')
    expect(html).not.toContain('vfd-broadcast-action-stack')
    expect(html).not.toContain('vfd-felt-side-pot')
    expect(html).not.toContain('>Main<')
  })
})

describe('two-table floor', () => {
  it('draws two tables with the same mosaic seating as the rest of the floor', () => {
    const html = renderToStaticMarkup(
      createElement(VenueFloorBody, {
        floorSpec: resolveVenueFloorSpec({ populatedTableCount: 2 }),
        floorTiles: [tile(1), tile(2)],
        showHeroSpotlight: false,
        hostFocusTable: null,
        featuredTile: null,
        companionTiles: [],
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
      }),
    )
    expect(html).toContain('data-table-tile="1"')
    expect(html).toContain('data-table-tile="2"')
    expect(html).not.toContain('venue-floor-dual-broadcast')
  })
})

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

  it('puts the mosaic header on each two-table card and keeps that cue off the felt', () => {
    const html = renderToStaticMarkup(
      createElement(VenueDualTableBroadcast, {
        tiles: [{ ...tile(9), phase: 'answering' }, { ...tile(10), phase: 'answering' }],
        prefersReducedMotion: true,
        floorSpec: resolveVenueFloorSpec({ populatedTableCount: 2 }) ?? undefined,
      }),
    )
    expect(html.match(/vfd-mosaic-status-band--answering/g)?.length).toBe(2)
    expect(html).toContain('Answer on your phone')
    expect(html.match(/vfd-mosaic-table-num/g)?.length).toBe(2)
    expect(html).not.toContain('vfd-broadcast-action-message')
  })
})
