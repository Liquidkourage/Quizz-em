import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, displayedMainPot, type GameState } from '@qhe/core'
import GameInfoCard from './GameInfoCard'
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
  it('shows the main pot on the felt', () => {
    const hand = unevenHand()
    const html = renderToStaticMarkup(
      createElement(PlayerFeltPot, { pot: displayedMainPot(hand) }),
    )
    expect(html).toContain('Pot $300')
    expect(html).not.toContain('of which')
    expect(html).not.toContain('850')
    const even = { ...hand, round: { ...hand.round, pot: 200, handContributions: { a: 100, b: 100, c: 0 } } }
    const quiet = renderToStaticMarkup(createElement(PlayerFeltPot, { pot: displayedMainPot(even) }))
    expect(quiet).toContain('Pot $200')
    expect(quiet).not.toContain('of which')
  })

  it('shows the main pot on the sticky bar and the info card', () => {
    const hand = unevenHand()
    const sticky = renderToStaticMarkup(
      createElement(StickyQuestionBar, {
        questionText: 'How many?',
        pot: displayedMainPot(hand),
      }),
    )
    expect(sticky).toContain('300')
    expect(sticky).not.toContain('of which')
    expect(sticky).not.toContain('850')
    const card = renderToStaticMarkup(createElement(GameInfoCard, { gameState: hand }))
    expect(card).toContain('300')
    expect(card).not.toContain('of which')
    expect(card).not.toContain('850')
  })
})
