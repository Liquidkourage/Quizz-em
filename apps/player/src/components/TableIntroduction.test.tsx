import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TableIntroduction } from './TableIntroduction'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const players = [
  { id: 'a', name: 'Devon B.', bankroll: 980 },
  { id: 'me', name: 'Alice Chen', bankroll: 1000 },
  { id: 'c', name: 'Sam', bankroll: 980 },
]

function markup(revealedCount: number): string {
  return renderToStaticMarkup(
    createElement(TableIntroduction, {
      players,
      heroId: 'me',
      tableId: '1',
      smallBlind: 10,
      bigBlind: 20,
      revealedCount,
    }),
  )
}

describe('TableIntroduction', () => {
  it('opens on the empty table', () => {
    const html = markup(0)
    expect(html).toContain('Table 1')
    expect(html).toContain('Waiting for the host to deal')
    expect(html).not.toContain('Devon')
    expect(html).not.toContain('Alice')
    expect(html).not.toContain('>You<')
  })

  it('brings the other players in before you, then names the whole table', () => {
    const first = markup(1)
    expect(first).toContain('Devon B.')
    expect(first).not.toContain('Alice')

    const done = markup(3)
    expect(done).toContain('3 players. The host will deal when ready.')
  })

  it('uses the same landscape oval as the hand, including on an upright phone', () => {
    const html = markup(3)
    const slot = html.slice(html.indexOf('player-felt-rotate-slot'))
    expect(slot).toContain('player-game-felt--fill')
    expect(slot).not.toContain('player-intro-fit')
    expect(slot).not.toContain('player-intro-stage')
    expect(html).toContain('player-sticky-question')
    const start = css.indexOf('Pre-deal table keeps its shape')
    const block = start < 0 ? '' : css.slice(start, start + 900)
    expect(block).toContain('player-game-felt--fill')
    expect(block).not.toContain('aspect-ratio: 4 / 5')
    expect(block).not.toContain('min(100cqi, calc((100cqh - 3.4rem) * 0.8), 34rem)')
  })

  it('shrinks the seat cards with the table so they stay off the felt', () => {
    const plateAt = css.indexOf('.player-intro-plate {')
    const plate = plateAt < 0 ? '' : css.slice(plateAt, plateAt + 320)
    expect(plate).toContain('min-width: 0')
    const nameAt = css.indexOf('.player-intro-name {')
    const name = nameAt < 0 ? '' : css.slice(nameAt, nameAt + 280)
    expect(name).toContain('cqh')
  })

  it('stretches the pre-deal table to the same column as the hand', () => {
    const start = css.indexOf('Pre-deal table needs the hand\'s column')
    const block = start < 0 ? '' : css.slice(start, start + 700)
    expect(block).toContain('.player-game-layout--live-fit .player-intro')
    expect(block).toContain('align-items: stretch')
    expect(block).toContain('flex: 1 1 auto')
    expect(block).toContain('.player-intro > .player-seated-table')
    expect(block).toContain('width: 100%')
    expect(block).not.toContain('70dvh')
    const sideways = css.indexOf('The seating introduction fills the same column as the hand')
    const side = sideways < 0 ? '' : css.slice(sideways, sideways + 400)
    expect(side).toContain('.player-intro')
    expect(side).toContain('height: 100%')
  })

  it('keeps pre-deal names readable when a sideways phone is short', () => {
    const start = css.lastIndexOf('short sideways phone still reads the name')
    const block = start < 0 ? '' : css.slice(start, start + 700)
    expect(block).toContain('@container intro (min-aspect-ratio: 3/2)')
    expect(block).toContain('font-size: 0.95rem')
    expect(block).toContain('overflow: visible')
    expect(block).toContain('.player-intro-stack')
    expect(block).toContain('font-size: 0.85rem')
    expect(block).toContain('height: auto')
  })

  it('widens the pre-deal table when the phone is sideways', () => {
    const start = css.indexOf('A sideways phone uses the width')
    const block = start < 0 ? '' : css.slice(start, start + 650)
    expect(block).toContain('min-aspect-ratio: 3/2')
    expect(block).not.toContain('aspect-ratio: 3 / 2')
    expect(block).toContain('0.95rem')
  })
})
