import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerScoresSheet from './PlayerScoresSheet'

const playerCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8')

describe('player scores sheet', () => {
  it('shows chip leaders with stacks and tables', () => {
    const html = renderToStaticMarkup(
      createElement(PlayerScoresSheet, {
        brief: { scoresBoard: 'chips', scores: [{ name: 'Bo', value: 1500, tableNum: 1 }] },
      }),
    )
    expect(html).toContain('Chip leaders')
    expect(html).toContain('Bo')
    expect(html).toContain('Table 1')
    expect(html).toContain('aria-label="$1,500"')
    expect(html).toContain('role="dialog"')
    expect(html).toContain('player-scores-modal-list')
    expect(html).not.toContain('inset-0')
  })

  it('shows trivia leaders', () => {
    const html = renderToStaticMarkup(
      createElement(PlayerScoresSheet, {
        brief: { scoresBoard: 'trivia', scores: [{ name: 'Ada', value: 10, tableNum: null }] },
      }),
    )
    expect(html).toContain('Trivia leaders')
    expect(html).toContain('Ada')
    expect(html).toContain('10 pts')
    expect(html).not.toContain('Table')
  })

  it('stays off the phone for every other display mode', () => {
    const html = renderToStaticMarkup(
      createElement(PlayerScoresSheet, {
        brief: { scoresBoard: null, scores: [{ name: 'Bo', value: 1, tableNum: 1 }] },
      }),
    )
    expect(html).toBe('')
  })

  it('scrolls inside a phone-sized popup', () => {
    const rule = playerCss.slice(playerCss.indexOf('.player-scores-modal-list'))
    expect(rule.startsWith('.player-scores-modal-list')).toBe(true)
    expect(rule.slice(0, 400)).toContain('overflow-y: auto')
    expect(rule.slice(0, 400)).toContain('-webkit-overflow-scrolling: touch')
    const card = playerCss.slice(playerCss.indexOf('.player-scores-modal-card'))
    expect(card.slice(0, 500)).toContain('max-height:')
  })
})
