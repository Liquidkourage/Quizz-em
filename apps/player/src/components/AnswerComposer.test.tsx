import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, type GameState } from '@qhe/core'
import { EMPTY_COMPOSED_ANSWER } from '../playerModel/answerComposition'
import AnswerComposer from './AnswerComposer'

function answering(): GameState {
  let gs = createEmptyGame('V', 'h', '1')
  gs = addPlayer(gs, 'a', 'Ada', 1000)
  return {
    ...gs,
    phase: 'answering',
    round: { ...gs.round, question: { id: 'q', text: 'How many?', answer: 4 } },
  }
}

describe('answer composer clock', () => {
  it('says time is up without inviting another edit', () => {
    const gs = answering()
    const html = renderToStaticMarkup(
      createElement(AnswerComposer, {
        gameState: gs,
        currentPlayer: gs.players[0]!,
        composed: EMPTY_COMPOSED_ANSWER,
        selectedCards: [],
        remainingSec: 0,
        onSelectCard: () => {},
        onToggleDecimal: () => {},
        onBackspace: () => {},
        onClear: () => {},
        onSubmit: () => {},
      }),
    )
    expect(html).toContain('Time is up')
    expect(html).not.toContain('keep editing')
    expect(html).not.toContain('host reveals')
    expect(html).not.toContain('player-game-timer--urgent')
  })

  it('keeps a locked answer settled once the clock has finished', () => {
    const gs = answering()
    const html = renderToStaticMarkup(
      createElement(AnswerComposer, {
        gameState: gs,
        currentPlayer: gs.players[0]!,
        composed: EMPTY_COMPOSED_ANSWER,
        selectedCards: [],
        remainingSec: 0,
        submittedDisplay: '42',
        onSelectCard: () => {},
        onToggleDecimal: () => {},
        onBackspace: () => {},
        onClear: () => {},
        onSubmit: () => {},
        onEditSubmitted: () => {},
      }),
    )
    expect(html).toContain('Locked in.')
    expect(html).not.toContain('before time runs out')
    expect(html).not.toContain('keep editing')
  })
})
