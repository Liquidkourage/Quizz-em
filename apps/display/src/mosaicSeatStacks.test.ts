import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  MosaicSeatStackAmount,
  mosaicSeatInitialFontPx,
  mosaicSeatStackFontPx,
  mosaicShowsSeatStacks,
} from './mosaicSeatStacks'

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

  it('sizes initials and stacks from the felt so they read across the room', () => {
    const feltPx = 480
    const cupPx = 32
    expect(mosaicSeatInitialFontPx(feltPx)).toBeGreaterThanOrEqual(44)
    expect(mosaicSeatInitialFontPx(feltPx)).toBeGreaterThan(Math.round(cupPx * 0.54))
    expect(mosaicSeatStackFontPx(feltPx)).toBeGreaterThanOrEqual(30)
    expect(mosaicSeatStackFontPx(feltPx)).toBeGreaterThan(Math.round(cupPx * 0.46))
  })

  it('prints the seat stack as a chip amount', () => {
    const html = renderToStaticMarkup(
      createElement(MosaicSeatStackAmount, { name: 'Ada', amount: 1250, fontPx: 18 }),
    )
    expect(html).toContain('1,250')
    expect(html).toContain('data-mosaic-seat-stack')
    expect(html).toContain('Ada stack')
    expect(html).toContain('vfd-mosaic-dollar--live')
    expect(html).toContain('font-size:18px')
  })
})
