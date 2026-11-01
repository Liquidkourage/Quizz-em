import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { LeaderboardFrame } from './LeaderboardFrame'

describe('public leaderboard background', () => {
  it('uses the same plate as the table view', () => {
    const html = renderToStaticMarkup(createElement(LeaderboardFrame, null, 'Ranks'))
    expect(html).toContain('welcome-background.png')
    expect(html).toContain('Ranks')
  })
})
