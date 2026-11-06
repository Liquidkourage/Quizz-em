import { describe, expect, it } from 'vitest'
import {
  mosaicSeatRail,
  mosaicSeatStatusFontPx,
  mosaicSidePotOverflowLabel,
  mosaicSidePotOverflowWidthPx,
  mosaicSidePotPlaqueMetrics,
  mosaicSidePotsThatFit,
  mosaicTileFrame,
} from './mosaicTileLayout'

const TILES = [
  { name: '2-up', w: 900, h: 720 },
  { name: '3-up', w: 600, h: 640 },
  { name: '6-up', w: 600, h: 400 },
  { name: '8-up', w: 450, h: 400 },
  { name: '13-up', w: 360, h: 270 },
  { name: '15-up', w: 340, h: 250 },
] as const

describe('mosaic side-pot plaques', () => {
  it('keeps every pot until the tile has been measured', () => {
    expect(mosaicSidePotsThatFit(3, 0)).toBe(3)
    expect(mosaicSidePotsThatFit(3, 0, 0)).toBe(3)
  })

  it('sizes a plaque from the tile, and keeps a roomy tile larger than a dense one', () => {
    const roomy = mosaicSidePotPlaqueMetrics(900, 720, 1)
    const dense = mosaicSidePotPlaqueMetrics(340, 250, 1)
    expect(roomy.heightPx).toBeGreaterThan(dense.heightPx)
    expect(roomy.heightPx).toBeGreaterThanOrEqual(60)
    expect(roomy.heightPx).toBeLessThanOrEqual(88)
    expect(roomy.showTitle).toBe(true)
    expect(dense.heightPx).toBeLessThanOrEqual(42)
    expect(dense.showTitle).toBe(false)
    expect(roomy.widthPx / roomy.heightPx).toBeCloseTo(2.5, 1)
    expect(dense.widthPx / dense.heightPx).toBeCloseTo(2.5, 1)
  })

  it('shrinks each plaque once a full-size row would overflow the tile', () => {
    const one = mosaicSidePotPlaqueMetrics(280, 400, 1)
    const four = mosaicSidePotPlaqueMetrics(280, 400, 4)
    expect(four.widthPx).toBeLessThan(one.widthPx)
    expect(four.heightPx).toBeLessThanOrEqual(one.heightPx)
  })

  it('fits only the plaques that stay inside the tile and stay legible', () => {
    expect(mosaicSidePotsThatFit(2, 100, 80)).toBe(0)
    for (const tile of TILES) {
      const fit = mosaicSidePotsThatFit(4, tile.w, tile.h)
      expect(fit, tile.name).toBeGreaterThan(0)
      expect(fit, tile.name).toBeLessThanOrEqual(4)
      const hidden = 4 - fit
      const slots = fit + (hidden > 0 ? 1 : 0)
      const box = mosaicSidePotPlaqueMetrics(tile.w, tile.h, slots)
      const row =
        fit * box.widthPx +
        mosaicSidePotOverflowWidthPx(box, hidden) +
        Math.max(0, slots - 1) * box.gapPx
      expect(row, tile.name).toBeLessThanOrEqual(tile.w - 8)
      expect(box.heightPx, tile.name).toBeLessThanOrEqual(tile.h * 0.16 + 1)
    }
  })

  it('uses a shorter tile to drop plaques before a taller tile of the same width does', () => {
    const short = mosaicSidePotsThatFit(3, 520, 110)
    const tall = mosaicSidePotsThatFit(3, 520, 480)
    expect(tall).toBeGreaterThan(short)
  })

  it('names the pots that did not fit', () => {
    expect(mosaicSidePotOverflowLabel(0)).toBe('')
    expect(mosaicSidePotOverflowLabel(2)).toBe('+2 MORE')
    const box = mosaicSidePotPlaqueMetrics(340, 250, 2)
    expect(mosaicSidePotOverflowWidthPx(box, 2)).toBeGreaterThan(box.heightPx)
  })
})

describe('mosaic tile frame', () => {
  it('reserves the same bands from the tile alone, before any side pot exists', () => {
    const frame = mosaicTileFrame(600, 400)
    expect(frame.topStatusPx).toBeGreaterThan(0)
    expect(frame.bottomStatusPx).toBe(frame.topStatusPx)
    expect(frame.plaqueLanePx).toBeGreaterThan(0)
    const chrome = frame.topStatusPx + frame.bottomStatusPx + frame.plaqueLanePx
    expect(chrome).toBeLessThanOrEqual(400 * 0.28 + 1)
    expect(mosaicTileFrame(0, 0)).toEqual({ topStatusPx: 0, bottomStatusPx: 0, plaqueLanePx: 0 })
  })

  it('keeps the status caption smaller than the initials and on one scale for every rail', () => {
    const font = mosaicSeatStatusFontPx(600)
    expect(font).toBeGreaterThanOrEqual(11)
    expect(font).toBeLessThanOrEqual(17)
    expect(mosaicSeatRail(0)).toBe('top')
    expect(mosaicSeatRail(1)).toBe('top')
    expect(mosaicSeatRail(7)).toBe('top')
    expect(mosaicSeatRail(2)).toBe('right')
    expect(mosaicSeatRail(6)).toBe('left')
    expect(mosaicSeatRail(3)).toBe('bottom')
    expect(mosaicSeatRail(4)).toBe('bottom')
    expect(mosaicSeatRail(5)).toBe('bottom')
    expect(mosaicSeatRail(10)).toBe('right')
  })
})
