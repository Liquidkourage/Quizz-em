import { describe, expect, it } from 'vitest'
import {
  PLAYER_FELT_HOLE_FAN_DEG,
  playerFeltHoleOverlapPx,
  playerFeltHolePairWidthPx,
} from './playerFeltHoleCards'
import { stadiumPlayerHoleCardScale } from './stadiumSeatLayout'

describe('PlayerFeltHoleCards layout', () => {
  it('splays the pair with the public felt fan and overlap', () => {
    const scale = stadiumPlayerHoleCardScale(360, 5)
    const cardW = Math.round(64 * scale)
    const overlap = playerFeltHoleOverlapPx(cardW)
    expect(PLAYER_FELT_HOLE_FAN_DEG).toBe(8)
    expect(overlap).toBe(Math.max(3, Math.round(cardW * 0.36)))
    expect(playerFeltHolePairWidthPx(scale)).toBe(cardW * 2 - overlap)
  })

  it('keeps a five-seat pair narrow enough to sit at the rail', () => {
    const scale = stadiumPlayerHoleCardScale(360, 5)
    expect(playerFeltHolePairWidthPx(scale)).toBeLessThan(360 * 0.28)
  })
})
