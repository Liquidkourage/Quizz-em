import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, feltSidePotAmount, type GameState } from '@qhe/core'
import { PlayerFeltPot } from './TableFeltView'
import StickyQuestionBar from './StickyQuestionBar'

function unevenHand(): GameState {
  let gs = createEmptyGame('V', 'h')
  gs = addPlayer(gs, 'a', 'Ada', 1000)
  gs = addPlayer(gs, 'b', 'Bo', 1000)
  gs = addPlayer(gs, 'c', 'Cara', 1000)
  return {
    ...gs,
    tableId: '1',
    phase: 'betting',
    round: {
      ...gs.round,
      pot: 850,
      handContributions: { a: 100, b: 500, c: 250 },
      question: { id: 'q', text: 'How many?', answer: 4 },
    },
  }
}

describe('player side pot', () => {
  it('prints the side amount on the felt', () => {
    const hand = unevenHand()
    const html = renderToStaticMarkup(
      createElement(PlayerFeltPot, { pot: hand.round.pot, sidePot: feltSidePotAmount(hand) }),
    )
    expect(html).toContain('Pot')
    expect(html).toContain('Side')
    expect(html).toContain('300')
    const even = { ...hand, round: { ...hand.round, pot: 200, handContributions: { a: 100, b: 100, c: 0 } } }
    const quiet = renderToStaticMarkup(
      createElement(PlayerFeltPot, { pot: even.round.pot, sidePot: feltSidePotAmount(even) }),
    )
    expect(quiet).toContain('Pot')
    expect(quiet).not.toContain('Side')
  })

  it('prints the side amount beside the sticky pot', () => {
    const html = renderToStaticMarkup(
      createElement(StickyQuestionBar, {
        questionText: 'How many?',
        pot: 850,
        sidePot: 300,
      }),
    )
    expect(html).toContain('Side')
    expect(html).toContain('300')
  })
})
