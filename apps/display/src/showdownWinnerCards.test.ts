import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BroadcastShowdownPanel } from './BroadcastShowdownPanel'
import type { ShowdownResultRow } from './showdownDisplay'
import { ShowdownWinnerCompPanel } from './ShowdownWinnerCompPanel'
import { showdownRowsFromTile } from './showdownDisplay'

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
