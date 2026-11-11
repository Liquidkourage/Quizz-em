import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  FeltBetPushMarks,
  advanceBetPushes,
  betPushChipPx,
  betPushCoversStreet,
  betPushFits,
  betPushFontPx,
  betPushPoint,
  boxAround,
  chipsAdded,
  placeBetPushes,
} from './feltBetPush'

describe('chips just put in the pot', () => {
  it('uses the chips that just left the stack', () => {
    expect(chipsAdded(100, 140)).toBe(40)
    expect(chipsAdded(100, 100)).toBeNull()
    expect(chipsAdded(100, 80)).toBeNull()
    expect(chipsAdded(null, 40)).toBeNull()
  })

  it('waits until a previous amount is known, then keeps the cue for two seconds', () => {
    const first = advanceBetPushes(null, [40, 0], 1_000, 2_000, [])
    expect(first.pushes).toEqual([])
    expect(first.baseline).toEqual([40, 0])
    const bet = advanceBetPushes(first.baseline, [40, 25], 1_500, 2_000, first.pushes)
    expect(bet.pushes).toEqual([{ seat: 1, amount: 25, untilMs: 3_500 }])
    const quiet = advanceBetPushes(bet.baseline, [40, 25], 2_000, 2_000, bet.pushes)
    expect(quiet.pushes).toEqual([{ seat: 1, amount: 25, untilMs: 3_500 }])
    const gone = advanceBetPushes(quiet.baseline, [40, 25], 3_500, 2_000, quiet.pushes)
    expect(gone.pushes).toEqual([])
  })

  it('sits halfway from the player to the pot', () => {
    expect(betPushPoint({ x: 0, y: 0 }, { x: 100, y: 40 })).toEqual({ x: 50, y: 20 })
  })

  it('shows the amount when the green in front of the player is clear', () => {
    const spot = betPushPoint({ x: 20, y: 20 }, { x: 200, y: 120 })
    const label = boxAround(spot, 48, 20)
    const felt = { left: 0, top: 0, width: 400, height: 240 }
    const pot = boxAround({ x: 200, y: 120 }, 70, 28)
    expect(betPushFits(label, felt, [pot])).toBe(true)
  })

  it('stays off when the amount would cover the pot or leave the felt', () => {
    const felt = { left: 0, top: 0, width: 400, height: 240 }
    const pot = boxAround({ x: 200, y: 120 }, 80, 30)
    expect(betPushFits(boxAround({ x: 200, y: 120 }, 48, 20), felt, [pot])).toBe(false)
    expect(betPushFits(boxAround({ x: 8, y: 8 }, 40, 18), felt, [])).toBe(false)
  })

  it('keeps the halfway chip when that spot is open', () => {
    const marks = placeBetPushes({
      ringW: 400,
      ringH: 240,
      center: { x: 200, y: 120 },
      seats: [{ x: 40, y: 200 }],
      pushes: [{ seat: 0, amount: 40, untilMs: 5 }],
      obstacles: [],
    })
    expect(marks).toEqual([
      expect.objectContaining({
        amount: 40,
        leftPct: 30,
        topPct: (160 / 240) * 100,
        sizePx: 53,
      }),
    ])
  })

  it('uses the same chip size at every seat', () => {
    const marks = placeBetPushes({
      ringW: 400,
      ringH: 240,
      center: { x: 200, y: 120 },
      seats: [
        { x: 200, y: 40 },
        { x: 360, y: 120 },
      ],
      pushes: [
        { seat: 0, amount: 40, untilMs: 5 },
        { seat: 1, amount: 20, untilMs: 6 },
      ],
      obstacles: [{ left: 150, top: 70, width: 100, height: 50 }],
    })
    expect(marks.map((mark) => mark.sizePx)).toEqual([betPushChipPx(240), betPushChipPx(240)])
  })

  it('stops in an open patch beside the path when the halfway point is covered', () => {
    const marks = placeBetPushes({
      ringW: 400,
      ringH: 240,
      center: { x: 200, y: 120 },
      seats: [{ x: 40, y: 120 }],
      pushes: [{ seat: 0, amount: 40, untilMs: 5 }],
      obstacles: [{ left: 80, top: 96, width: 80, height: 48 }],
    })
    expect(marks).toHaveLength(1)
    const mark = marks[0]!
    const x = (mark.leftPct / 100) * 400
    const y = (mark.topPct / 100) * 240
    expect(mark.sizePx).toBeGreaterThanOrEqual(16)
    expect(x).toBeGreaterThan(40)
    expect(x).toBeLessThan(200)
    expect(y < 96 || y > 144).toBe(true)
    expect(betPushFits(boxAround({ x, y }, mark.sizePx, mark.sizePx), { left: 32, top: 26.4, width: 336, height: 187.2 }, [
      { left: 80, top: 96, width: 80, height: 48 },
    ])).toBe(true)
  })

  it('stays off when no open patch is big enough', () => {
    const marks = placeBetPushes({
      ringW: 400,
      ringH: 240,
      center: { x: 200, y: 120 },
      seats: [{ x: 40, y: 120 }],
      pushes: [{ seat: 0, amount: 40, untilMs: 5 }],
      obstacles: [{ left: 0, top: 0, width: 400, height: 240 }],
    })
    expect(marks).toEqual([])
  })

  it('reads the amount on a chip that glides from the player toward the pot', () => {
    const html = renderToStaticMarkup(
      createElement(FeltBetPushMarks, {
        marks: [{
          key: '1',
          amount: 40,
          fromLeftPct: 12,
          fromTopPct: 78,
          leftPct: 30,
          topPct: 40,
          sizePx: 72,
        }],
      }),
    )
    expect(html).toContain('$40')
    expect(html).toContain('felt-bet-chip')
    expect(html).toContain('left:30%')
    expect(html).toContain('top:40%')
    expect(html).toContain('--felt-bet-from-left:12%')
    expect(html).toContain('--felt-bet-from-top:78%')
    expect(html).toContain('72px')
    expect(html).toContain('Bungee')
  })

  it('sets the amount a little larger than the chip used to allow', () => {
    expect(betPushFontPx(40, 72)).toBe(30)
  })

  it('paints the moving chip in front of the pot', () => {
    const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
    const block = css.slice(css.indexOf('.felt-bet-chip {'))
    const rule = block.slice(0, block.indexOf('}'))
    expect(rule).toContain('z-index: 134')
  })

  it('grows to the open patch on a four-table felt', () => {
    expect(betPushChipPx(364)).toBe(80)
  })

  it('may rest on the street once the felt is about an eight-table size', () => {
    expect(betPushCoversStreet(262)).toBe(true)
    expect(betPushCoversStreet(364)).toBe(false)
  })

  it('rests on the street during the second betting round', () => {
    expect(betPushCoversStreet(480, 200)).toBe(true)
  })

  it('shows the chips added on the next betting round', () => {
    const round1 = advanceBetPushes([10, 20], [30, 20], 1_000, 2_000, [])
    expect(round1.pushes.map((push) => push.seat)).toEqual([0])
    const round2 = advanceBetPushes(round1.baseline, [30, 50], 5_000, 2_000, [])
    expect(round2.pushes).toEqual([{ seat: 1, amount: 30, untilMs: 7_000 }])
  })
})
