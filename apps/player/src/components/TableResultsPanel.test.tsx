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
  })
})
