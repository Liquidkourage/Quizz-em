import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MosaicSeatStackAmount, mosaicShowsSeatStacks } from './mosaicSeatStacks'

describe('mosaic seat stacks', () => {
  it('shows stack amounts only while the felt is not in a live hand', () => {
    expect(mosaicShowsSeatStacks('lobby')).toBe(true)
    expect(mosaicShowsSeatStacks('question')).toBe(true)
    expect(mosaicShowsSeatStacks('intermission')).toBe(true)
    expect(mosaicShowsSeatStacks('betting')).toBe(false)
    expect(mosaicShowsSeatStacks('answering')).toBe(false)
    expect(mosaicShowsSeatStacks('reveal')).toBe(false)
    expect(mosaicShowsSeatStacks('showdown')).toBe(false)
  })

  it('prints the seat stack as a chip amount', () => {
    const html = renderToStaticMarkup(
      createElement(MosaicSeatStackAmount, { name: 'Ada', amount: 1250, fontPx: 18 }),
    )
    expect(html).toContain('1,250')
    expect(html).toContain('data-mosaic-seat-stack')
    expect(html).toContain('Ada stack')
  })
})
