import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  MosaicSeatStackAmount,
  MOSAIC_HOLE_CARD_LAYER,
  MOSAIC_SEAT_INITIAL_LAYER,
  mosaicHoleClearOfInitialsFrac,
  mosaicSeatInitialFontPx,
  mosaicSeatInitialShiftXPx,
  mosaicSeatStackClearPx,
  mosaicCrowdedStackLayout,
  mosaicSeatStackFontPx,
  mosaicShowsSeatStacks,
  mosaicStreetCardBoxPx,
  MOSAIC_STACK_LABEL_EM,
} from './mosaicSeatStacks'
import {
  mosaicSeatDotPct,
  mosaicSeatHoleInwardFrac,
  mosaicSeatHoleLayout,
  venueMosaicFeltCenterPct,
} from './venueMosaicSeatGeometry'

type StackRect = { x: number; y: number; width: number; height: number }

function stackRect(transform: string, anchorX: number, anchorY: number, labelW: number, labelH: number): StackRect {
  const xPin = transform.includes('translate(0,') ? 0 : transform.includes('translate(-100%') ? -labelW : -labelW / 2
  const yPin = transform.includes(', 0)') ? 0 : transform.includes(', -100%)') ? -labelH : -labelH / 2
  return { x: anchorX + xPin, y: anchorY + yPin, width: labelW, height: labelH }
}

/** How many pixels the hole-card anchor sits past the inward edge of the initials. */
function holeGapPastInitials(seat: number, w: number, h: number, font: number, frac: number): number {
  const cup = mosaicSeatDotPct(seat, 8, w, h)
  const center = venueMosaicFeltCenterPct(w, h)
  const hole = mosaicSeatHoleLayout(seat, 8, w, h, frac)
  const cupX = (cup.leftPct / 100) * w
  const cupY = (cup.topPct / 100) * h
  const dx = (center.leftPct / 100) * w - cupX
  const dy = (center.topPct / 100) * h - cupY
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist
  const shiftX = mosaicSeatInitialShiftXPx(seat, w, h, font)
  const hw = font * 0.78
  const hh = font * 0.52
  const inwardMost = shiftX * ux + Math.abs(ux) * hw + Math.abs(uy) * hh
  const holeDist = Math.hypot((hole.leftPct / 100) * w - cupX, (hole.topPct / 100) * h - cupY)
  return holeDist - inwardMost
}

function rectsMeet(a: StackRect, b: StackRect, gap: number): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y
}

function stackPocketsClear(w: number, h: number, font: number): boolean {
  const labelW = font * MOSAIC_STACK_LABEL_EM
  const boxes = Array.from({ length: 8 }, (_, seat) => {
    const layout = mosaicCrowdedStackLayout(seat, w, h)
    return stackRect(layout.transform, (layout.leftPct / 100) * w, (layout.topPct / 100) * h, labelW, font)
  })
  const initials = mosaicSeatInitialFontPx(w)
  for (const box of boxes) {
    if (box.x < 1 || box.y < 1 || box.x + box.width > w - 1 || box.y + box.height > h - 1) return false
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (rectsMeet(boxes[i]!, boxes[j]!, 2)) return false
    }
    const cup = mosaicSeatDotPct(i, 8, w, h)
    const shift = mosaicSeatInitialShiftXPx(i, w, h, initials)
    const glyph: StackRect = {
      x: (cup.leftPct / 100) * w + shift - initials * 0.78,
      y: (cup.topPct / 100) * h - initials * 0.52,
      width: initials * 1.56,
      height: initials * 1.04,
    }
    if (rectsMeet(boxes[i]!, glyph, 1)) return false
  }
  const center = venueMosaicFeltCenterPct(w, h)
  const cx = (center.leftPct / 100) * w
  const cy = (center.topPct / 100) * h
  const pot: StackRect = { x: cx - 12, y: cy - 10, width: 24, height: 20 }
  return boxes.every((box) => !rectsMeet(box, pot, 0))
}

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
    const open = mosaicSeatStackFontPx(w, 3, h)
    const crowded = mosaicSeatStackFontPx(w, 8, h)
    expect(crowded).toBeLessThan(open)
    expect(crowded).toBeGreaterThanOrEqual(20)
    expect(mosaicSeatStackClearPx(36, mosaicSeatInitialFontPx(w))).toBeGreaterThan(36)
  })

  it('keeps a full table of stacks in separate pockets', () => {
    for (const w of [340, 420, 520]) {
      const h = Math.round((w * 10) / 17)
      const font = mosaicSeatStackFontPx(w, 8, h)
      const room = mosaicSeatStackFontPx(w, 3, h)
      expect(font).toBeLessThanOrEqual(room)
      expect(font).toBeGreaterThanOrEqual(20)
      expect(stackPocketsClear(w, h, font)).toBe(true)
      expect(font === room || stackPocketsClear(w, h, font + 1)).toBe(false)
    }
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

  it('keeps the initials above the hole cards and the pair readable toward center', () => {
    const initialZ = Number(MOSAIC_SEAT_INITIAL_LAYER.match(/z-\[(\d+)\]/)?.[1])
    const holeZ = Number(MOSAIC_HOLE_CARD_LAYER.match(/z-\[(\d+)\]/)?.[1])
    expect(initialZ).toBeGreaterThan(holeZ)
    for (const w of [560, 640, 880]) {
      const h = Math.round(w / (1262 / 643))
      const font = mosaicSeatInitialFontPx(w)
      for (let seat = 0; seat < 8; seat++) {
        const frac = mosaicHoleClearOfInitialsFrac(seat, w, h)
        expect(frac).toBeGreaterThanOrEqual(mosaicSeatHoleInwardFrac(seat))
        expect(frac).toBeLessThanOrEqual(0.38)
        const gap = holeGapPastInitials(seat, w, h, font, frac)
        expect(gap, `${w} seat ${seat}`).toBeGreaterThanOrEqual(14)
      }
    }
  })

  it('sizes street cards at least as large as the initials', () => {
    for (const w of [280, 400, 520]) {
      const initials = mosaicSeatInitialFontPx(w)
      const card = mosaicStreetCardBoxPx(w, 'compact')
      expect(card.widthPx).toBeGreaterThanOrEqual(initials)
      expect(card.heightPx).toBeGreaterThanOrEqual(initials)
    }
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
