import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  MosaicSeatStackAmount,
  mosaicSeatInitialFontPx,
  mosaicSeatInitialShiftXPx,
  mosaicSeatStackClearPx,
  mosaicSeatStackFontPx,
  mosaicShowsSeatStacks,
} from './mosaicSeatStacks'
import { mosaicSeatDotPct } from './venueMosaicSeatGeometry'

describe('mosaic seat stacks', () => {
  it('shows stack amounts in the lobby and on a break, not once a question is up', () => {
    expect(mosaicShowsSeatStacks('lobby')).toBe(true)
    expect(mosaicShowsSeatStacks('intermission')).toBe(true)
    expect(mosaicShowsSeatStacks('question')).toBe(false)
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

  it('fits a full-table stack inside the gap between neighboring cups', () => {
    const w = 480
    const h = 255
    const open = mosaicSeatStackFontPx(w, 3)
    const crowded = mosaicSeatStackFontPx(w, 8)
    expect(crowded).toBeLessThan(open)
    expect(crowded).toBeGreaterThanOrEqual(28)
    let minGap = Infinity
    for (let i = 0; i < 8; i++) {
      const a = mosaicSeatDotPct(i, 8, w, h)
      const b = mosaicSeatDotPct((i + 1) % 8, 8, w, h)
      const gap = Math.hypot(((a.leftPct - b.leftPct) / 100) * w, ((a.topPct - b.topPct) / 100) * h)
      minGap = Math.min(minGap, gap)
    }
    expect(crowded * 3.3).toBeLessThan(minGap)
    expect(mosaicSeatStackClearPx(36, mosaicSeatInitialFontPx(w))).toBeGreaterThan(36)
  })

  it('pulls side initials inside the card edge', () => {
    const w = 480
    const h = 255
    const font = mosaicSeatInitialFontPx(w)
    const half = font * 0.78
    expect(mosaicSeatInitialShiftXPx(0, w, h, font)).toBe(0)
    expect(mosaicSeatInitialShiftXPx(4, w, h, font)).toBe(0)
    for (const seat of [2, 6]) {
      const cup = mosaicSeatDotPct(seat, 8, w, h)
      const shift = mosaicSeatInitialShiftXPx(seat, w, h, font)
      const center = (cup.leftPct / 100) * w + shift
      expect(center - half).toBeGreaterThanOrEqual(2)
      expect(center + half).toBeLessThanOrEqual(w - 2)
    }
    expect(mosaicSeatInitialShiftXPx(6, w, h, font)).toBeGreaterThan(0)
    expect(mosaicSeatInitialShiftXPx(2, w, h, font)).toBeLessThan(0)
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
