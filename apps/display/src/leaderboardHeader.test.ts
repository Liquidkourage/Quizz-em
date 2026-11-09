import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LeaderboardHeader } from './LeaderboardHeader'

describe('public leaderboard header', () => {
  it('shows the board name and nothing under it', () => {
    const html = renderToStaticMarkup(createElement(LeaderboardHeader, { title: 'Trivia leaders' }))
    expect(html).toContain('Trivia leaders')
    expect(html).not.toContain('Trivia brain')
    expect(html).not.toContain('36 players')
    expect(html).not.toContain('Closest guesses')
    expect(html).not.toContain('venue-lb-logo-wrap')
    expect(html).not.toContain('venue-lb-title-crown')
  })
})
