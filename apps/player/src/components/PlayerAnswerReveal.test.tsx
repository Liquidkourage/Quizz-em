import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ANSWER_REVEAL_BEFORE_WINNERS_MS } from '@qhe/core'
import PlayerAnswerReveal from './PlayerAnswerReveal'

describe('player answer reveal card', () => {
  it('shows the same correct-answer card as the public screen', () => {
    const html = renderToStaticMarkup(
      createElement(PlayerAnswerReveal, {
        question: 'How many feet are in a mile?',
        answer: 5280,
      }),
    )
    expect(html).toContain('The answer is')
    expect(html).toContain('Correct answer')
    expect(html).toContain('How many feet are in a mile?')
    expect(html).toContain('5,280')
    expect(html).toContain(`animation-duration:${ANSWER_REVEAL_BEFORE_WINNERS_MS}ms`)
    expect(html).not.toContain('data-showdown-winner-cards')
  })
})
