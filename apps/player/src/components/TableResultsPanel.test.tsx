import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createEmptyGame } from '@qhe/core'
import { buildTableResults } from '../playerModel/tableResults'
import TableResultsPanel from './TableResultsPanel'

describe('table results panel', () => {
  it('shows how far each guess was off, the points, and a sort control on every column', () => {
    let gs = createEmptyGame('HOST01', 'host', '1')
    gs = {
      ...gs,
      phase: 'showdown',
      players: [
        { id: 'a', name: 'Cara', bankroll: 1000, hand: [], hasFolded: false, isAllIn: false, submittedAnswer: 40 },
        { id: 'b', name: 'Alice', bankroll: 1000, hand: [], hasFolded: false, isAllIn: false, submittedAnswer: 50 },
      ],
      round: {
        ...gs.round,
        pot: 50,
        question: { id: 'q1', text: 'How many?', answer: 50 },
        handContributions: { a: 25, b: 25 },
      },
    }
    const html = renderToStaticMarkup(createElement(TableResultsPanel, { results: buildTableResults(gs, 'a')! }))
    const headers = ['Name', 'Answer', 'Off', 'Pts', 'Stack', 'Change']
    for (const header of headers) expect(html).toContain(header)
    expect(html).toContain('aria-sort="ascending"')
    expect(html.indexOf('Alice')).toBeLessThan(html.indexOf('Cara'))
    expect(html).toContain('>10<')
    expect(html).toContain('>0<')
    expect(html).not.toContain('Best hand')
  })

  it('mentions the best hand under your line once the cards are known', () => {
    let gs = createEmptyGame('HOST01', 'host', '1')
    const cards = [1, 2, 3, 4, 5, 6, 9].map((digit) => ({ digit })) as {
      digit: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    }[]
    gs = {
      ...gs,
      phase: 'showdown',
      players: [
        {
          id: 'a',
          name: 'Ada',
          bankroll: 1000,
          hand: cards.slice(0, 2),
          hasFolded: false,
          isAllIn: false,
          submittedAnswer: 12345,
        },
      ],
      round: {
        ...gs.round,
        pot: 0,
        communityCards: cards.slice(2),
        question: { id: 'q1', text: 'How many?', answer: 12340 },
      },
    }
    const html = renderToStaticMarkup(createElement(TableResultsPanel, { results: buildTableResults(gs, 'a')! }))
    expect(html).toContain('Best hand 12,345 — you played it.')
    expect(html).toContain('player-table-results-best')
  })

  it('opens a best-hand popup over the results, and celebrates a hand they played', () => {
    let gs = createEmptyGame('HOST01', 'host', '1')
    const cards = [1, 2, 3, 4, 5, 6, 9].map((digit) => ({ digit })) as {
      digit: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    }[]
    gs = {
      ...gs,
      phase: 'showdown',
      players: [
        {
          id: 'a',
          name: 'Ada',
          bankroll: 1000,
          hand: cards.slice(0, 2),
          hasFolded: false,
          isAllIn: false,
          submittedAnswer: 12345,
        },
        {
          id: 'b',
          name: 'Bo',
          bankroll: 1000,
          hand: cards.slice(0, 2),
          hasFolded: false,
          isAllIn: false,
          submittedAnswer: 12349,
        },
      ],
      round: {
        ...gs.round,
        pot: 0,
        communityCards: cards.slice(2),
        question: { id: 'q1', text: 'How many?', answer: 12340 },
      },
    }
    const played = renderToStaticMarkup(createElement(TableResultsPanel, { results: buildTableResults(gs, 'a')! }))
    expect(played).toContain('role="dialog"')
    expect(played).toContain('player-best-hand-number')
    expect(played).toContain('12,345')
    expect(played).toContain('You played it.')
    expect(played).toContain('>Close<')
    expect(played).toContain('Best hand 12,345 — you played it.')

    const missed = renderToStaticMarkup(createElement(TableResultsPanel, { results: buildTableResults(gs, 'b')! }))
    expect(missed).toContain('role="dialog"')
    expect(missed).toContain('player-best-hand-number')
    expect(missed).toContain('12,345')
    expect(missed).not.toContain('You played it.')
    expect(missed).toContain('>Best hand 12,345<')
  })
})
