import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HandSummary } from '../playerModel/handSummary'
import PostHandSummaryCard from './PostHandSummaryCard'

const summary: HandSummary = {
  stackDelta: -120,
  pointsGained: 0,
  submittedAnswer: null,
  correctAnswer: 20,
  triviaPointsThisHand: 0,
  formattedSubmitted: null,
  formattedCorrect: '20',
}

describe('post-hand summary', () => {
  it('shows the stack and trivia points without a Last hand heading', () => {
    const html = renderToStaticMarkup(createElement(PostHandSummaryCard, { summary }))
    expect(html).toContain('Stack')
    expect(html).toContain('Trivia pts')
    expect(html).toContain('−$120')
    expect(html).not.toContain('Last hand')
    expect(html).not.toContain('player-game-panel-title')
  })
})
