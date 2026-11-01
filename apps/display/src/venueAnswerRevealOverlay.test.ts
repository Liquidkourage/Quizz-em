import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueAnswerRevealOverlay, { REVEAL_QUESTION_MAX_FONT_VH } from './VenueAnswerRevealOverlay'

function revealQuestionRule(): string {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  const blocks = [...css.matchAll(/\.display-fit-question-host-reveal\s*\{([^}]*)\}/g)]
  return blocks.map((match) => match[1] ?? '').find((body) => body.includes('max-height')) ?? ''
}

describe('answer reveal popup', () => {
  it('shows the question large and leaves the five cards off the popup', () => {
    const html = renderToStaticMarkup(
      createElement(VenueAnswerRevealOverlay, {
        payload: {
          question: 'How many feet are in a mile?',
          answer: 5280,
        },
      }),
    )

    expect(html).toContain('How many feet are in a mile?')
    expect(html).toContain('display-fit-question-host-reveal')
    expect(html).not.toContain('data-showdown-winner-cards')
    expect(revealQuestionRule()).toContain('height: min(48vh, 30rem)')
    expect(REVEAL_QUESTION_MAX_FONT_VH).toBeGreaterThanOrEqual(0.34)
  })
})
