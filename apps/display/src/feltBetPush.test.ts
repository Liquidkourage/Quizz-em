import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  FeltBetPushMarks,
  advanceBetPushes,
  betPushFits,
  betPushPoint,
  boxAround,
  chipsAdded,
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
  })
})
