import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')

describe('player lobby on a wide window', () => {
  it('fills the monitor instead of sitting as a short column', () => {
    const start = css.indexOf('Wide lobby fills the window')
    const wide = start < 0 ? '' : css.slice(start, start + 700)
    expect(wide).toContain('.player-game-layout:not(.player-game-layout--live-fit) .player-game-shell')
    expect(wide).toContain('flex: 1 1 auto')
    expect(wide).toContain('width: 100%')
    expect(wide).toContain('max-width: none')
    expect(wide).toContain('justify-content: space-evenly')
  })

  it('keeps the queue and quit on a short phone', () => {
    const wideHeader = css.indexOf('@media (min-width: 768px)')
    const shortHeader = css.indexOf('Short lobby waiting card')
    expect(wideHeader).toBeGreaterThan(0)
    expect(shortHeader).toBeGreaterThan(wideHeader)
    const short = css.slice(shortHeader, shortHeader + 1100)
    expect(short).toContain('.player-lobby-body')
    expect(short).toContain('overflow-y: auto')
    expect(short).toContain('height: clamp(3.2rem, 18vh, 5rem)')
    expect(css.slice(wideHeader, wideHeader + 900)).toContain('height: clamp(9rem, 14vh, 11.5rem)')
  })

  it('keeps Join Game on a short landscape phone', () => {
    const start = css.indexOf('Short join form')
    const block = start < 0 ? '' : css.slice(start, start + 900)
    expect(block).toContain('@media (max-height: 520px)')
    expect(block).toContain('.player-join-shell')
    expect(block).toContain('max-height: 100%')
    expect(block).toContain('height: clamp(2.4rem, 14vh, 3.6rem)')
    expect(block).toContain('.player-join-body')
    expect(block).toContain('overflow-y: auto')
  })

  it('keeps Join Game and the footnote on the shortest landscape phone', () => {
    const start = css.indexOf('Shortest join form')
    const block = start < 0 ? '' : css.slice(start, start + 900)
    expect(block).toContain('@media (max-height: 360px)')
    expect(block).toContain('.player-join-actions')
    expect(block).toContain('flex: 0 0 auto')
    expect(block).toContain('.player-join-fields')
    expect(block).toContain('overflow-y: auto')
    expect(block).not.toContain('margin-top: auto')
  })

  it('centers the join box under the logo on an upright phone', () => {
    const start = css.indexOf('Portrait join box sits in the middle')
    const block = start < 0 ? '' : css.slice(start, start + 700)
    expect(block).toContain('@media (orientation: portrait)')
    expect(block).toContain('.player-join-screen .player-join-body')
    expect(block).toContain('justify-content: center')
    expect(block).toContain('.player-join-form')
    expect(block).toContain('flex: 0 0 auto')
    expect(block).toContain('.player-join-actions')
    expect(block).toContain('margin-top: 0')
    expect(block).not.toContain('orientation: landscape')
    expect(block).not.toContain('.player-join-header')
  })
})
