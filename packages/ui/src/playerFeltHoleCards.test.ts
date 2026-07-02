import { describe, expect, it } from 'vitest'
import {
  PLAYER_FELT_HOLE_CARD_GAP_PX,
  playerFeltHolePairWidthPx,
} from './playerFeltHoleCards'
import { stadiumPlayerHoleCardScale } from './stadiumSeatLayout'

describe('PlayerFeltHoleCards layout', () => {
  it('reserves independent columns with a fixed gap', () => {
    const scale = stadiumPlayerHoleCardScale(360)
    const cardW = Math.round(64 * scale)
    expect(playerFeltHolePairWidthPx(scale)).toBe(cardW * 2 + PLAYER_FELT_HOLE_CARD_GAP_PX)
    expect(PLAYER_FELT_HOLE_CARD_GAP_PX).toBeGreaterThan(0)
  })
})
