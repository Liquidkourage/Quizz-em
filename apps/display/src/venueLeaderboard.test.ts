import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import VenueLeaderboardPanelGrid from './VenueLeaderboardPanelGrid'
import {
  captureVenueHandStackBaselines,
  formatVenueBankroll,
  formatVenueTriviaPoints,
  formatVenueBankrollDigits,
  formatVenueDisplayPlayerName,
  venueLeaderboardColumns,
  venueLeaderboardFooterStats,
  venueLeaderboardPlayerKey,
  venueLeaderboardRowsFromTiles,
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

  it('leaves a points-only player off the chip scores', () => {
    const rows = venueLeaderboardRowsFromTiles([
      tile({
        tableNum: 1,
        seatNames: ['Ada Lane', 'Bo Kent', '', '', '', '', '', ''],
        seatBankrolls: [500, 0, 0, 0, 0, 0, 0, 0],
        seatPointsOnly: [false, true, false, false, false, false, false, false],
      }),
    ])
    expect(rows.map((row) => row.name)).toEqual(['Ada Lane'])
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
  it('caps at four columns', () => {
    expect(venueLeaderboardColumns(79)).toBe(4)
    expect(venueLeaderboardColumns(120)).toBe(4)
  })
})

describe('venueLeaderboardFooterStats', () => {
  it('derives top and median from ranked rows', () => {
    const rows = venueLeaderboardRowsFromTiles([
      tile({ tableNum: 1, seatBankrolls: [100, 200, 0, 0, 0, 0, 0, 0], seatNames: ['A', 'B', '', '', '', '', '', ''] }),
    ])
    const stats = venueLeaderboardFooterStats(rows, 3)
    expect(stats?.topStack).toBe(200)
    expect(stats?.medianStack).toBe(150)
    expect(stats?.liveTables).toBe(3)
  })
})

describe('formatVenueTriviaPoints', () => {
  it('always shows hundredths', () => {
    expect(formatVenueTriviaPoints(66.666666)).toBe('66.67 pts')
    expect(formatVenueTriviaPoints(90)).toBe('90.00 pts')
    expect(formatVenueTriviaPoints(1234.567)).toBe('1,234.57 pts')
  })
})

describe('formatVenueBankrollDigits', () => {
  it('formats digits without the currency sign', () => {
    expect(formatVenueBankrollDigits(160)).toBe('160')
    expect(formatVenueBankroll(160)).toBe('$160')
    expect(formatVenueBankrollDigits(7030)).toBe('7,030')
  })
})

describe('leaderboard stack change', () => {
  it('draws the change with the chip mark', () => {
    const html = renderToStaticMarkup(
      createElement(VenueLeaderboardPanelGrid, {
        page: {
          pageNumber: 1,
          pageCount: 1,
          rankStart: 1,
          rankEnd: 1,
          columnCount: 1,
          showTopThreePodium: false,
          columns: [
            {
              rankStart: 1,
              rankEnd: 1,
              gridRowCount: 1,
              players: [
                {
                  name: 'Ada Lane',
                  tableNum: 1,
                  seatNum: 1,
                  bankroll: 1500,
                  stackDelta: 300,
                  rank: 1,
                },
              ],
            },
          ],
        },
      }),
    )
    expect(html).toContain('chip-mark')
    expect(html.replace(/aria-label="[^"]*"/g, '')).not.toContain('$')
  })
})

describe('formatVenueDisplayPlayerName', () => {
  it('uses first name and last initial', () => {
    expect(formatVenueDisplayPlayerName('Alice Chen')).toBe('Alice C.')
    expect(formatVenueDisplayPlayerName('Carla M.')).toBe('Carla M.')
    expect(formatVenueDisplayPlayerName('Grace')).toBe('Grace')
    expect(formatVenueDisplayPlayerName('Alice C. 2')).toBe('Alice C. 2')
  })
})
