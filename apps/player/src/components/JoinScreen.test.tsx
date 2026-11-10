import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import JoinScreen from './JoinScreen'
import type { PlayerJoinBootstrap } from '../playerUrlParams'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const prefs: PlayerJoinBootstrap = {
  firstName: 'Jay',
  lastInitial: 'L',
  roomCode: 'HOST01',
  autoSeat: false,
  tableId: '1',
  playerId: 'human:test',
  roomFromUrl: false,
  nameFromUrl: false,
}

describe('join screen venue code and button', () => {
  it('puts the venue code and Join game on one line, neither stretched across the screen', () => {
    const html = renderToStaticMarkup(
      createElement(JoinScreen, { prefs, onChange: () => {}, onJoin: () => {} }),
    )
    const rowAt = html.indexOf('player-join-code-row')
    const row = html.slice(rowAt, html.indexOf('player-join-footnote'))
    expect(rowAt).toBeGreaterThan(-1)
    expect(row).toContain('id="player-venue-code"')
    expect(row).toContain('Join game')
    expect(html.indexOf('player-join-actions')).toBeGreaterThan(html.indexOf('Join game'))

    const ruleAt = css.indexOf('.player-join-code-row {')
    const rule = css.slice(ruleAt, ruleAt + 420)
    expect(ruleAt).toBeGreaterThan(-1)
    expect(rule).toContain('display: flex')
    expect(rule).toContain('align-items: flex-end')
    expect(rule).toContain('width: auto')
  })
})
