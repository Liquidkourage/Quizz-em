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
})
