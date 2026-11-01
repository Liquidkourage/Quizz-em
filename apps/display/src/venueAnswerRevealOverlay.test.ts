import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueAnswerRevealOverlay from './VenueAnswerRevealOverlay'

function revealQuestionMaxHeight(): string {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  const blocks = [...css.matchAll(/\.display-fit-question-host-reveal\s*\{([^}]*)\}/g)]
  const sized = blocks.map((match) => match[1] ?? '').find((body) => body.includes('max-height'))
  return sized?.match(/max-height:\s*([^;]+)/)?.[1]?.trim() ?? ''
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
    expect(revealQuestionMaxHeight()).toBe('min(50vh, 28rem)')
  })
})
