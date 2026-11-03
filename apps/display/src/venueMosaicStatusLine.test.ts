import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { VenueAerialFloorGrid } from './VenueEightTablesPreview'
import { resolveVenueFloorSpec } from './venueFloorSpec'

function tile(tableNum: number, phase: string, extra: Partial<DisplayVenueTileSnapshot> = {}): DisplayVenueTileSnapshot {
  return {
    tableNum,
    seated: 4,
    pot: 200,
    phase,
    seatNames: ['Ada', 'Bo', 'Cara', 'Dee'],
    ...extra,
  }
}

function cardHtml(html: string, tableNum: number): string {
  const marker = `data-table-tile="${tableNum}"`
  const start = html.indexOf(marker)
  const next = html.indexOf('data-table-tile=', start + marker.length)
  return html.slice(start, next === -1 ? undefined : next)
}

/** The title grid that holds the table number. */
function titleRowHtml(card: string): string {
  const classAt = card.indexOf('grid shrink-0 gap-x-1')
  const open = card.lastIndexOf('<div', classAt)
  let depth = 0
  for (let i = open; i < card.length; i++) {
    if (card.startsWith('<div', i)) {
      depth += 1
      i += 3
      continue
    }
    if (card.startsWith('</div>', i)) {
      depth -= 1
      if (depth === 0) return card.slice(open, i + 6)
      i += 5
    }
  }
  return ''
}

/** Felt-center stack, where the pot sits on the green. */
function feltCenterHtml(card: string): string {
  const at = card.indexOf('translate(-50%, -50%)')
  if (at < 0) return ''
  return card.slice(at, at + 900)
}

describe('public table status line', () => {
  it('keeps the cue on the same line as the table number', () => {
    const spec = resolveVenueFloorSpec({ populatedTableCount: 6 })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: [
          tile(1, 'answering'),
          tile(2, 'betting', { isBettingOpen: false }),
          tile(3, 'lobby'),
          tile(4, 'lobby'),
          tile(5, 'lobby'),
          tile(6, 'lobby'),
        ],
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
        floorSpec: spec!,
      }),
    )
    const answering = titleRowHtml(cardHtml(html, 1))
    const closed = titleRowHtml(cardHtml(html, 2))
    expect(answering).toContain('vfd-mosaic-table-num')
    expect(answering).toContain('Answer on your phone')
    expect(answering).not.toContain('row-start-2')
    expect(closed).toContain('vfd-mosaic-table-num')
    expect(closed).toContain('No more bets')
    expect(closed).not.toContain('$200')
    expect(feltCenterHtml(cardHtml(html, 2))).toContain('$200')
  })

  it('keeps the pot in the felt center and leaves the phase off the card', () => {
    const spec = resolveVenueFloorSpec({ populatedTableCount: 8 })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: [
          tile(1, 'question', { pot: 0 }),
          tile(2, 'intermission'),
          tile(3, 'lobby'),
          tile(4, 'betting', { isBettingOpen: true }),
        ],
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
        floorSpec: spec!,
      }),
    )
    const question = cardHtml(html, 1)
    const title = titleRowHtml(question)
    expect(title).not.toContain('Question')
    expect(title).not.toContain('Pot $0')
    expect(feltCenterHtml(question)).toContain('$0')
    expect(cardHtml(html, 2)).not.toContain('Break')
    expect(cardHtml(html, 3)).not.toContain('Lobby')
    expect(cardHtml(html, 4)).not.toContain('Wagering')
  })

  it('names the 9 o’clock player when six people are seated', () => {
    const names = ['', '', '', '', '', '', 'Maria A.']
    const spec = resolveVenueFloorSpec({ populatedTableCount: 8 })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: [
          tile(1, 'betting', {
            seated: 6,
            isBettingOpen: true,
            currentPlayerIndex: 6,
            actingSeatIndex: 6,
            actingCallAmount: 20,
            seatNames: names,
          }),
        ],
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
        floorSpec: spec!,
      }),
    )
    const title = titleRowHtml(cardHtml(html, 1))
    expect(title).toContain('Maria A.')
    expect(title).toContain('to call')
  })

  it('says to bet when the player faces nothing', () => {
    const spec = resolveVenueFloorSpec({ populatedTableCount: 8 })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: [
          tile(1, 'betting', {
            pot: 200,
            isBettingOpen: true,
            currentPlayerIndex: 0,
            actingSeatIndex: 0,
            actingCallAmount: 0,
            seatNames: ['Maria A.', 'Bo K.', 'Cara D.', 'Dee E.'],
          }),
        ],
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
        floorSpec: spec!,
      }),
    )
    const title = titleRowHtml(cardHtml(html, 1))
    expect(title).toContain('Maria A.')
    expect(title).toContain('to bet')
    expect(title).not.toContain('to call')
    expect(title).not.toContain('vfd-mosaic-dollar')
  })

  it('numbers a second player who shares a name', () => {
    const spec = resolveVenueFloorSpec({ populatedTableCount: 8 })
    const html = renderToStaticMarkup(
      createElement(VenueAerialFloorGrid, {
        tiles: [
          tile(1, 'betting', {
            isBettingOpen: true,
            currentPlayerIndex: 1,
            actingSeatIndex: 1,
            actingCallAmount: 20,
            seatNames: ['Alice C.', 'Alice C.', 'Bo K.'],
          }),
        ],
        showHeadline: false,
        skipMountIntro: true,
        prefersReducedMotion: true,
        floorSpec: spec!,
      }),
    )
    const title = titleRowHtml(cardHtml(html, 1))
    expect(title).toContain('Alice C. 2')
    expect(title).toContain('to call')
  })
})
