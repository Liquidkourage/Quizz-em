import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlayerTableHeader } from './PlayerTableHeader'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('seated rejoin notice', () => {
  it('stays out of the short header so it cannot cover the top seat', () => {
    const html = renderToStaticMarkup(
      createElement(PlayerTableHeader, {
        disconnected: true,
        compactLive: true,
        lastTableId: '1',
        onReconnect: () => undefined,
        onQuit: () => undefined,
      }),
    )
    expect(html).not.toContain('player-reconnect-banner')
    expect(html).not.toContain('Rejoin now')
  })

  it('docks under the table as one row', () => {
    const start = css.indexOf('Seated rejoin sits under the table')
    const block = start < 0 ? '' : css.slice(start, start + 700)
    expect(block).toContain('.player-game-layout--live-fit .player-reconnect-banner')
    expect(block).toContain('flex: 0 0 auto')
    expect(block).toContain('flex-direction: row')
    expect(block).toContain('min-height: 2.75rem')
  })
})
