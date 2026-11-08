import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerForfeitStrip from './PlayerForfeitStrip'

describe('missed guess strip', () => {
  it('tells the seat they scored nothing while the table is back', () => {
    const html = renderToStaticMarkup(createElement(PlayerForfeitStrip, { show: true }))
    expect(html).toContain('No guess in time — 0 points, and you cannot win this pot.')
    expect(html).toContain('player-game-strip')
  })

  it('stays off when the seat can still guess', () => {
    expect(renderToStaticMarkup(createElement(PlayerForfeitStrip, { show: false }))).toBe('')
  })
})
