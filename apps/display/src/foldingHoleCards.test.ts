import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { holeMuckStarts } from './foldingHoleCards'

describe('folded hole cards', () => {
  it('slides when a fold takes the cards away in the same update', () => {
    expect(holeMuckStarts(true, true, false, false)).toBe(true)
    expect(holeMuckStarts(true, true, true, false)).toBe(true)
    expect(holeMuckStarts(false, true, false, false)).toBe(false)
    expect(holeMuckStarts(true, false, true, false)).toBe(false)
    expect(holeMuckStarts(true, true, false, true)).toBe(false)
  })

  it('moves the cards toward the middle of the felt', () => {
    const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
    const block = css.slice(css.indexOf('@keyframes vfd-hole-muck {'))
    const rule = block.slice(0, block.indexOf('}'))
    expect(rule).toContain('left: 50%')
    expect(rule).toContain('top: 50%')
  })
})
