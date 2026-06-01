import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { venueLeaderboardColumns, venueLeaderboardRowsFromTiles } from './venueLeaderboard'

function tile(partial: Partial<DisplayVenueTileSnapshot> & { tableNum: number }): DisplayVenueTileSnapshot {
  return {
    seated: 2,
    pot: 100,
    phase: 'betting',
    seatNames: ['Alice C.', 'Bob H.', '', '', '', '', '', ''],
    seatBankrolls: [1500, 900, 0, 0, 0, 0, 0, 0],
    ...partial,
  }
}

describe('venueLeaderboardRowsFromTiles', () => {
  it('sorts by bankroll during gameplay', () => {
    const rows = venueLeaderboardRowsFromTiles([tile({ tableNum: 1 }), tile({ tableNum: 2 })])
    expect(rows[0]!.bankroll).toBeGreaterThanOrEqual(rows[1]!.bankroll)
  })
})

describe('venueLeaderboardColumns', () => {
  it('adds columns as player count grows', () => {
    expect(venueLeaderboardColumns(12)).toBeLessThan(venueLeaderboardColumns(120))
  })
})
