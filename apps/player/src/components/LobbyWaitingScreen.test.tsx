import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import LobbyWaitingScreen from './LobbyWaitingScreen'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('waiting to be seated', () => {
  it('shows the place in line as the main fact and a full quit control', () => {
    const html = renderToStaticMarkup(
      createElement(LobbyWaitingScreen, {
        playerName: 'Ada A.',
        venueCode: 'HOST01',
        waitingCount: 1,
        waitingPosition: 1,
        onQuit: () => {},
      }),
    )
    const title = html.slice(html.indexOf('player-lobby-title'), html.indexOf('player-lobby-title') + 180)
    expect(title).toContain('You&#x27;re in')
    expect(title).not.toContain('waiting to be seated')
    const place = html.slice(html.indexOf('player-lobby-place'), html.indexOf('player-lobby-place') + 160)
    expect(place).toContain('#1')
    expect(html).toContain('1 player waiting to be seated')
    expect(html).toContain('Ada A.')
    expect(html).toContain('HOST01')
    expect(html).toContain('player-lobby-actions')
    expect(html).toContain('>Quit<')
  })

  it('keeps quit a full tap at the bottom of the waiting card', () => {
    const start = css.indexOf('Lobby quit is a real control')
    const block = start < 0 ? '' : css.slice(start, start + 900)
    expect(block).toContain('.player-lobby-actions')
    expect(block).toContain('margin-top: auto')
    expect(block).toContain('min-height: 2.75rem')
    expect(block).toContain('.player-lobby-place')
  })
})
