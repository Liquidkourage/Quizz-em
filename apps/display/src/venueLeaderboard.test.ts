import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  captureVenueHandStackBaselines,
  venueLeaderboardColumnRangeLabel,
  venueLeaderboardColumns,
  venueLeaderboardFooterStats,
  venueLeaderboardPlayerKey,
  venueLeaderboardRowsFromTiles,
  venueLeaderboardSplitColumns,
} from './venueLeaderboard'

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

  it('sorts by bankroll pre-round (all lobby)', () => {
    const rows = venueLeaderboardRowsFromTiles([
      tile({
        tableNum: 1,
        phase: 'lobby',
        seatNames: ['Zara Q.', 'Amy B.', '', '', '', '', '', ''],
        seatBankrolls: [800, 1200, 0, 0, 0, 0, 0, 0],
      }),
    ])
    expect(rows[0]!.name).toBe('Amy B.')
    expect(rows[0]!.bankroll).toBe(1200)
    expect(rows[1]!.name).toBe('Zara Q.')
  })

  it('computes stack delta from hand-start baselines', () => {
    const tiles = [
      tile({
        tableNum: 1,
        phase: 'lobby',
        seatNames: ['Amy B.', '', '', '', '', '', '', ''],
        seatBankrolls: [1300, 0, 0, 0, 0, 0, 0, 0],
      }),
    ]
    const baselines = captureVenueHandStackBaselines([
      tile({
        tableNum: 1,
        phase: 'question',
        seatNames: ['Amy B.', '', '', '', '', '', '', ''],
        seatBankrolls: [1000, 0, 0, 0, 0, 0, 0, 0],
      }),
    ])
    const key = venueLeaderboardPlayerKey(1, 1, 'Amy B.')
    expect(baselines.get(key)).toBe(1000)
    const rows = venueLeaderboardRowsFromTiles(tiles, baselines)
    expect(rows[0]!.stackDelta).toBe(300)
  })
})

describe('venueLeaderboardColumns', () => {
  it('adds columns as player count grows', () => {
    expect(venueLeaderboardColumns(12)).toBeLessThan(venueLeaderboardColumns(120))
  })

  it('uses four columns at 64 players', () => {
    expect(venueLeaderboardColumns(64)).toBe(4)
    expect(venueLeaderboardColumns(16)).toBe(1)
    expect(venueLeaderboardColumns(32)).toBe(2)
  })
})

describe('venueLeaderboardSplitColumns', () => {
  it('labels column ranges for 64 players', () => {
    const rows = Array.from({ length: 64 }, (_, i) => ({
      name: `P${i}`,
      tableNum: 1,
      seatNum: 1,
      bankroll: 1000 - i,
      stackDelta: null,
    }))
    const { columns, rowCount } = venueLeaderboardSplitColumns(rows, 4)
    expect(columns.length).toBe(4)
    expect(rowCount).toBe(16)
    expect(venueLeaderboardColumnRangeLabel(0, rowCount, 64)).toBe('1–16')
    expect(venueLeaderboardColumnRangeLabel(3, rowCount, 64)).toBe('49–64')
  })
})

describe('venueLeaderboardFooterStats', () => {
  it('derives top, average, and median from ranked rows', () => {
    const rows = venueLeaderboardRowsFromTiles([
      tile({ tableNum: 1, seatBankrolls: [100, 200, 0, 0, 0, 0, 0, 0], seatNames: ['A', 'B', '', '', '', '', '', ''] }),
    ])
    const stats = venueLeaderboardFooterStats(rows, 3)
    expect(stats?.topStack).toBe(200)
    expect(stats?.averageStack).toBe(150)
    expect(stats?.liveTables).toBe(3)
  })
})
