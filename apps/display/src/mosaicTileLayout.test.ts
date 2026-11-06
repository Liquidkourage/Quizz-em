import { describe, expect, it } from 'vitest'
import {
  mosaicSeatRail,
  mosaicSeatStatusFontPx,
  mosaicSidePotOverflowLabel,
  mosaicSidePotOverflowWidthPx,
  mosaicSidePotAmountFontPx,
  mosaicReadablePlaqueMetrics,
  mosaicSidePotPlaqueMetrics,
  mosaicSidePotsThatFit,
  mosaicAnnotationClearancePx,
  mosaicFeltFitPx,
  mosaicFeltFillWidthPx,
  mosaicCornerDockPx,
  mosaicFeltReservePx,
  mosaicFeltWidthPx,
  mosaicSidePotCornerPlan,
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
    expect(dense.heightPx).toBeLessThanOrEqual(42)
    const shortAmount = mosaicSidePotAmountFontPx(roomy.heightPx, '6,320')
    const longAmount = mosaicSidePotAmountFontPx(roomy.heightPx, '1,234,567')
    expect(shortAmount).toBeGreaterThan(roomy.heightPx * 0.45)
    expect(longAmount).toBeLessThan(shortAmount)
    expect(longAmount).toBeGreaterThanOrEqual(18)
    expect(roomy.widthPx / roomy.heightPx).toBeCloseTo(2.5, 1)
    expect(dense.widthPx / dense.heightPx).toBeCloseTo(2.5, 1)
  })

  it('keeps a six-table plaque readable instead of shrinking it into the spare lane', () => {
    const frame = mosaicTileFrame(681, 518)
    const budget = frame.bottomStatusPx + frame.plaqueLanePx - 16
    const one = mosaicReadablePlaqueMetrics(681, 518, 1, budget)
    const two = mosaicReadablePlaqueMetrics(681, 518, 2, budget)
    expect(one.heightPx).toBeGreaterThanOrEqual(64)
    expect(one.heightPx).toBeLessThanOrEqual(80)
    expect(one.widthPx).toBeGreaterThanOrEqual(150)
    expect(two.heightPx).toBe(one.heightPx)
    expect(two.widthPx * 2 + two.gapPx).toBeLessThanOrEqual(681 - 16)
    expect(mosaicSidePotAmountFontPx(two.heightPx, '6,320')).toBeGreaterThanOrEqual(36)
    expect(mosaicSidePotsThatFit(4, 280, 400)).toBeLessThan(4)
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

  it('keeps a readable chip on a twenty-table tile and none on a tiny one', () => {
    const chip = mosaicReadablePlaqueMetrics(360, 190, 1, 48)
    expect(chip.heightPx).toBeGreaterThanOrEqual(34)
    expect(mosaicSidePotsThatFit(1, 360, 190)).toBe(1)
    expect(mosaicSidePotsThatFit(2, 100, 80)).toBe(0)
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
    expect(chrome).toBeLessThanOrEqual(400 * 0.4 + 1)
    expect(mosaicTileFrame(0, 0)).toEqual({ topStatusPx: 0, bottomStatusPx: 0, plaqueLanePx: 0 })
    const clearance = mosaicAnnotationClearancePx(520)
    expect(clearance).toBeGreaterThanOrEqual(12)
    const six = mosaicTileFrame(680, 520)
    expect(six.topStatusPx).toBeGreaterThanOrEqual(clearance + 24)
    expect(six.bottomStatusPx).toBe(six.topStatusPx)
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

  it('keeps the felt at 17:10 when a tile is short and wide', () => {
    const short = mosaicFeltFitPx(394, 118)
    expect(short.widthPx / short.heightPx).toBeCloseTo(1.7, 1)
    expect(short.widthPx).toBeLessThan(394)
    const exemplar = mosaicFeltFitPx(459, 270)
    expect(exemplar).toEqual({ widthPx: 459, heightPx: 270 })
    expect(mosaicFeltWidthPx(671, 671, 270)).toBe(459)
    expect(mosaicFeltWidthPx(671, 459, 270)).toBeNull()
    expect(mosaicFeltWidthPx(394, 394, 118)).toBe(201)
  })

  it('drops the center lane on every card so side pots sit in the corners', () => {
    for (const [width, height] of [
      [681, 484],
      [404, 244],
      [490, 205],
      [681, 319],
    ] as const) {
      const frame = mosaicTileFrame(width, height)
      const reserve = mosaicFeltReservePx(frame, width, height)
      expect(reserve.lanePx).toBe(0)
      expect(reserve.topPx).toBeLessThanOrEqual(16)
      expect(reserve.topPx).toBeLessThanOrEqual(frame.topStatusPx)
    }
    const frame = mosaicTileFrame(681, 484)
    const reserve = mosaicFeltReservePx(frame, 681, 484)
    const felt = mosaicFeltFitPx(671, 430 - reserve.topPx - reserve.lanePx)
    expect(felt.widthPx).toBeGreaterThan(640)
    expect(felt.widthPx / felt.heightPx).toBeCloseTo(1.7, 1)
  })

  it('grows the felt on a wide short card without crowding a narrow one', () => {
    const frame = mosaicTileFrame(490, 205)
    const reserve = mosaicFeltReservePx(frame, 490, 205)
    const fullLane = frame.bottomStatusPx + frame.plaqueLanePx
    const full = mosaicFeltFillWidthPx(480, 154, frame.topStatusPx, fullLane)
    const grown = mosaicFeltFillWidthPx(480, 154, reserve.topPx, reserve.lanePx)
    expect(reserve.topPx).toBeLessThan(frame.topStatusPx)
    expect(grown).toBeGreaterThan(full + 30)
    expect(grown / 490).toBeLessThan(0.5)
    expect(reserve.lanePx).toBe(0)
  })

  it('drops the center lane on a wide three-across card so the oval can grow', () => {
    const frame = mosaicTileFrame(681, 319)
    const reserve = mosaicFeltReservePx(frame, 681, 319)
    const banded = mosaicFeltFillWidthPx(671, 265, frame.topStatusPx, frame.bottomStatusPx + frame.plaqueLanePx)
    const grown = mosaicFeltFillWidthPx(671, 265, reserve.topPx, reserve.lanePx)
    expect(reserve.lanePx).toBe(0)
    expect(grown).toBeGreaterThan(banded + 40)
  })

  it('leaves a little room under the felt for 5-8 and 13-15 tables', () => {
    expect(mosaicCornerDockPx(4, 40)).toBe(0)
    expect(mosaicCornerDockPx(5, 40)).toBe(48)
    expect(mosaicCornerDockPx(8, 40)).toBe(48)
    expect(mosaicCornerDockPx(9, 40)).toBe(0)
    expect(mosaicCornerDockPx(12, 54)).toBe(0)
    expect(mosaicCornerDockPx(13, 36)).toBe(44)
    expect(mosaicCornerDockPx(15, 36)).toBe(44)
    expect(mosaicCornerDockPx(16, 36)).toBe(0)
    expect(mosaicCornerDockPx(6, 0)).toBe(0)
  })

  it('puts at most two side pots in the bottom corners', () => {
    expect(mosaicSidePotCornerPlan(0)).toEqual({ pots: 0, overflow: 0 })
    expect(mosaicSidePotCornerPlan(1)).toEqual({ pots: 1, overflow: 0 })
    expect(mosaicSidePotCornerPlan(2)).toEqual({ pots: 2, overflow: 0 })
    expect(mosaicSidePotCornerPlan(4)).toEqual({ pots: 1, overflow: 3 })
  })
})
