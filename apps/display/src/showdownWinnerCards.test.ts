import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { BroadcastShowdownPanel } from './BroadcastShowdownPanel'
import type { ShowdownResultRow } from './showdownDisplay'
import { ShowdownWinnerCompPanel } from './ShowdownWinnerCompPanel'
import { showdownRowsFromTile } from './showdownDisplay'
import { resolveShowdownDisplayPot } from './VenueFloorShowdownOverlay'
import { resolveShowdownSidePotLines } from './venueFloorSidePotDisplay'

const winner: ShowdownResultRow = {
  seat: 0,
  name: 'Ada',
  holes: [1, 9],
  submitted: 1924,
  hasFolded: false,
  communityBoard: [2, 4, 0, 3, 5],
  answerCommunityIndices: [0, 1, 2],
  answerCards: [
    { digit: 1, source: 'hole' },
    { digit: 9, source: 'hole' },
    { digit: 2, source: 'community' },
    { digit: 4, source: 'community' },
    { digit: 0, source: 'community' },
  ],
  chipPayout: 100,
}

describe('winner crown clearance', () => {
  it('keeps the broadcast winner crown inside the plaque', () => {
    const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
    const start = css.indexOf(
      ".vfd-broadcast-showdown-reveal[data-reveal-variant='winner'] .vfd-broadcast-showdown-reveal__crown",
    )
    const block = css.slice(start, start + 280)
    expect(block).toContain('top: 0.7rem')
    expect(block).toContain('translate(-50%, 0)')
    expect(block).not.toContain('-46%')
  })
})

describe('winner screen cards', () => {
  it('leaves the five answer cards off the table winner stage', () => {
    const html = renderToStaticMarkup(
      createElement(ShowdownWinnerCompPanel, {
        variant: 'winner',
        winners: [winner],
        chipRow: winner,
        pot: 100,
        correctAnswer: 1924,
        showdownStageDensity: 'hero',
        sizingTableCount: 8,
      }),
    )
    expect(html).toContain('Ada')
    expect(html).not.toContain('data-showdown-winner-cards')
  })

  it('leaves the five answer cards off the broadcast winner screen', () => {
    const html = renderToStaticMarkup(
      createElement(BroadcastShowdownPanel, {
        variant: 'winner',
        winners: [winner],
        chipRow: winner,
        pot: 100,
        correctAnswer: 1924,
        label: 'Winner',
      }),
    )
    expect(html).toContain('Ada')
    expect(html).not.toContain('data-showdown-winner-cards')
    expect(html).not.toContain('Winning Answer')
  })
})

function allInRow(name: string, seat: number, chipPayout: number): ShowdownResultRow {
  return {
    seat,
    name,
    holes: [1, 2],
    submitted: 40,
    hasFolded: false,
    communityBoard: [3, 4, 5, 6, 7],
    answerCommunityIndices: [],
    answerCards: [],
    chipPayout,
  }
}

describe('unequal all-in split', () => {
  const short = allInRow('Ada', 1, 100)
  const big = allInRow('Blake', 2, 500)

  it('does not average two different all-in payouts into one share', () => {
    expect(
      resolveShowdownDisplayPot({ pot: 600 } as DisplayVenueTileSnapshot, [short, big], 40),
    ).toBe(0)
  })

  it('keeps a tied unequal all-in off the side-pot card', () => {
    expect(resolveShowdownSidePotLines([big, short], 40)).toBeNull()
  })

  it('shows each all-in player the chips they actually receive on the broadcast card', () => {
    const html = renderToStaticMarkup(
      createElement(BroadcastShowdownPanel, {
        variant: 'split',
        winners: [short, big],
        chipRow: short,
        pot: 300,
        correctAnswer: 40,
        label: 'Split winners',
      }),
    )
    expect(html).toContain('aria-label="$100"')
    expect(html).toContain('aria-label="$500"')
    expect(html).not.toContain('aria-label="$300"')
    expect(html).not.toContain(' each')
  })

  it('shows each all-in player the chips they actually receive on the table card', () => {
    const html = renderToStaticMarkup(
      createElement(ShowdownWinnerCompPanel, {
        variant: 'split',
        winners: [short, big],
        chipRow: short,
        pot: 300,
        correctAnswer: 40,
        showdownStageDensity: 'hero',
        sizingTableCount: 2,
      }),
    )
    expect(html).toContain('aria-label="$100"')
    expect(html).toContain('aria-label="$500"')
    expect(html).not.toContain('$300')
  })
})

describe('showdown rows on the public table', () => {
  it('leaves a points-only player off the table', () => {
    const rows = showdownRowsFromTile({
      tableNum: 1,
      seated: 2,
      pot: 100,
      phase: 'showdown',
      seatNames: ['Ada Lane', 'Bo Kent'],
      seatPointsOnly: [false, true],
      seatSubmittedAnswers: [10, 12],
    })
    expect(rows.map((row) => row.name)).toEqual(['Ada Lane'])
  })
})
