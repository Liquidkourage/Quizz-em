import { describe, expect, it } from 'vitest'
import { soleChipWinner, soleChipWinnerName } from './venue-endgame'

describe('soleChipWinnerName', () => {
  it('names the last stack once the room is between hands', () => {
    expect(soleChipWinnerName(3, [
      { phase: 'lobby', players: [{ name: 'Ada Lane', bankroll: 4800 }] },
    ])).toBe('Ada Lane')
  })

  it('stays quiet during a hand and before the first payout', () => {
    expect(soleChipWinnerName(3, [
      { phase: 'showdown', players: [{ name: 'Ada Lane', bankroll: 4800 }] },
    ])).toBeNull()
    expect(soleChipWinnerName(0, [
      { phase: 'lobby', players: [{ name: 'Ada Lane', bankroll: 4800 }] },
    ])).toBeNull()
  })

  it('returns the table and the stack along with the name', () => {
    expect(soleChipWinner(1, [
      { tableNum: 4, phase: 'lobby', players: [{ name: 'Bea Moss', bankroll: 900 }] },
    ])).toEqual({ name: 'Bea Moss', tableNum: 4, bankroll: 900 })
  })

  it('stays quiet while two stacks remain', () => {
    expect(soleChipWinnerName(2, [
      {
        phase: 'lobby',
        players: [
          { name: 'Ada Lane', bankroll: 4800 },
          { name: 'Bo Kim', bankroll: 200 },
        ],
      },
    ])).toBeNull()
  })
})
