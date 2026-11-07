import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BlindChangeModal from './BlindChangeModal'

function zIndex(css: string, selector: string): number {
  const rule = css.slice(css.indexOf(selector))
  const match = rule.match(/z-index:\s*(\d+)/)
  return match ? Number(match[1]) : 0
}

describe('BlindChangeModal', () => {
  it('shows the new blinds', () => {
    const html = renderToStaticMarkup(
      createElement(BlindChangeModal, { notice: { smallBlind: 15, bigBlind: 30, atMs: 1 } }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Blinds')
    expect(html).toContain('aria-label="$15 / $30"')
  })

  it('paints above the chip leaderboard', () => {
    const html = renderToStaticMarkup(
      createElement(BlindChangeModal, { notice: { smallBlind: 15, bigBlind: 30, atMs: 1 } }),
    )
    expect(html).toContain('player-blind-change')
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    const blinds = zIndex(css, '.player-blind-change {')
    expect(blinds).toBeGreaterThan(zIndex(css, '.player-scores-modal {'))
    expect(blinds).toBeGreaterThan(zIndex(css, '.player-nudge-alert {'))
  })
})
