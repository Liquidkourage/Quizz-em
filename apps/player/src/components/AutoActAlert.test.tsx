import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AutoActAlert from './AutoActAlert'

function zIndex(css: string, selector: string): number {
  const rule = css.slice(css.indexOf(selector))
  const match = rule.match(/z-index:\s*(\d+)/)
  return match ? Number(match[1]) : 0
}

describe('AutoActAlert', () => {
  it('shows the call amount above the chip leaderboard and under the blinds card', () => {
    const html = renderToStaticMarkup(createElement(AutoActAlert, { message: 'Called $60', onDone: () => {} }))
    expect(html).toContain('player-auto-act')
    expect(html).toContain('aria-label="Called $60"')
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    const alert = zIndex(css, '.player-auto-act {')
    expect(alert).toBeGreaterThan(zIndex(css, '.player-scores-modal {'))
    expect(alert).toBeLessThan(zIndex(css, '.player-blind-change {'))
  })
})
