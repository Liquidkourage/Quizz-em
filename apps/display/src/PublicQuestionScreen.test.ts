import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PublicQuestionScreen, PUBLIC_QUESTION_MAX_FONT_VH } from './PublicQuestionScreen'

describe('PublicQuestionScreen', () => {
  it('puts the question on the screen and leaves the answer off', () => {
    const html = renderToStaticMarkup(
      createElement(PublicQuestionScreen, {
        text: 'How many feet are in a mile?',
        cueNumber: 3,
        cueTotal: 25,
      }),
    )
    expect(html).toContain('How many feet are in a mile?')
    expect(html).toContain('Question 3 of 25')
    expect(html).toContain('display-fit-question-host-fullscreen')
    expect(html).not.toContain('5280')
    expect(PUBLIC_QUESTION_MAX_FONT_VH).toBeGreaterThanOrEqual(0.18)
  })
})
