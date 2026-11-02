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
    expect(closed).toContain('$200')
  })
})
