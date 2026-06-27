import { describe, expect, it } from 'vitest'
import type { VenueLeaderboardRow } from './venueLeaderboard'
import {
  buildVenueLeaderboardPresentation,
  LEADERBOARD_MAX_COLUMNS,
  LEADERBOARD_MAX_PLAYERS_PER_PAGE,
  venueLeaderboardColumnRangeLabel,
  venueLeaderboardPageColumnCount,
  venueLeaderboardPageCount,
  venueLeaderboardPageSizes,
  venueLeaderboardPageUsesFullFieldLayout,
  venueLeaderboardSplitPageColumns,
} from './venueLeaderboardPresentation'

function mockRows(count: number): VenueLeaderboardRow[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    tableNum: Math.floor(i / 8) + 1,
    seatNum: (i % 8) + 1,
    bankroll: 5000 - i * 10,
    stackDelta: null,
  }))
}

describe('venueLeaderboardPageCount', () => {
  it('paginates beyond 64 players', () => {
    expect(venueLeaderboardPageCount(64)).toBe(1)
    expect(venueLeaderboardPageCount(65)).toBe(2)
    expect(venueLeaderboardPageCount(79)).toBe(2)
    expect(venueLeaderboardPageCount(128)).toBe(2)
    expect(venueLeaderboardPageCount(129)).toBe(3)
  })
})

describe('venueLeaderboardPageSizes', () => {
  it('rebalances 65 players instead of a 64 + 1 tail page', () => {
    expect(venueLeaderboardPageSizes(65)).toEqual([33, 32])
  })

  it('keeps a healthy tail when remainder is large enough', () => {
    expect(venueLeaderboardPageSizes(79)).toEqual([64, 15])
  })
})

describe('buildVenueLeaderboardPresentation', () => {
  it('uses four columns for 64 players on page 1', () => {
    const model = buildVenueLeaderboardPresentation(mockRows(64))
    expect(model.pages).toHaveLength(1)
    expect(model.pages[0]!.columnCount).toBe(4)
    expect(model.pages[0]!.rankStart).toBe(1)
    expect(model.pages[0]!.rankEnd).toBe(64)
    expect(model.pages[0]!.columns[0]!.rankStart).toBe(1)
    expect(model.pages[0]!.columns[0]!.rankEnd).toBe(16)
    expect(model.pages[0]!.columns[3]!.rankStart).toBe(49)
    expect(model.pages[0]!.columns[3]!.rankEnd).toBe(64)
  })

  it('uses four columns for 62 players with 49–62 in the last column', () => {
    const model = buildVenueLeaderboardPresentation(mockRows(62))
    expect(model.pages).toHaveLength(1)
    expect(model.pages[0]!.columnCount).toBe(4)
    expect(model.pages[0]!.columns[3]!.rankStart).toBe(49)
    expect(model.pages[0]!.columns[3]!.rankEnd).toBe(62)
    expect(venueLeaderboardPageUsesFullFieldLayout(model.pages[0]!)).toBe(true)
  })

  it('paginates 79 players into 64 + 15 without a fifth column', () => {
    const model = buildVenueLeaderboardPresentation(mockRows(79))
    expect(model.pages).toHaveLength(2)
    expect(model.pages[0]!.columnCount).toBe(4)
    expect(model.pages[0]!.columns.length).toBeLessThanOrEqual(LEADERBOARD_MAX_COLUMNS)
    expect(model.pages[1]!.rankStart).toBe(65)
    expect(model.pages[1]!.rankEnd).toBe(79)
    expect(model.pages[1]!.columnCount).toBe(1)
    expect(model.pages[1]!.showTopThreePodium).toBe(false)
  })

  it('balances 65 players across two readable pages', () => {
    const model = buildVenueLeaderboardPresentation(mockRows(65))
    expect(model.pages).toHaveLength(2)
    expect(model.pages[0]!.rankStart).toBe(1)
    expect(model.pages[0]!.rankEnd).toBe(33)
    expect(model.pages[1]!.rankStart).toBe(34)
    expect(model.pages[1]!.rankEnd).toBe(65)
    expect(model.pages[1]!.rankEnd - model.pages[1]!.rankStart + 1).toBeGreaterThan(1)
  })

  it('never exceeds 64 players per page', () => {
    const model = buildVenueLeaderboardPresentation(mockRows(200))
    for (const page of model.pages) {
      const count = page.rankEnd - page.rankStart + 1
      expect(count).toBeLessThanOrEqual(LEADERBOARD_MAX_PLAYERS_PER_PAGE)
      expect(page.columnCount).toBeLessThanOrEqual(LEADERBOARD_MAX_COLUMNS)
    }
  })
})

describe('venueLeaderboardColumnRangeLabel', () => {
  it('matches actual ranks when column-major split would mislabel with a formula', () => {
    const ranked = mockRows(79).map((row, i) => ({ ...row, rank: i + 1 }))
    const page1 = ranked.slice(0, 64)
    const columns = venueLeaderboardSplitPageColumns(page1, 5)
    expect(columns.length).toBeLessThanOrEqual(4)
  })

  it('labels 1–16 when rank 16 is in the column', () => {
    const ranked = mockRows(64).map((row, i) => ({ ...row, rank: i + 1 }))
    const columns = venueLeaderboardSplitPageColumns(ranked, 4)
    expect(venueLeaderboardColumnRangeLabel(columns[0]!)).toBe('1–16')
    expect(columns[0]!.players.some((p) => p.rank === 16)).toBe(true)
  })
})

describe('venueLeaderboardPageColumnCount', () => {
  it('autosizes tail pages for readability', () => {
    expect(venueLeaderboardPageColumnCount(15, false)).toBe(1)
    expect(venueLeaderboardPageColumnCount(64, true)).toBe(4)
    expect(venueLeaderboardPageColumnCount(32, true)).toBe(2)
  })

  it('uses two columns on page 1 for 9–16 players', () => {
    expect(venueLeaderboardPageColumnCount(15, true)).toBe(2)
  })

  it('uses four columns on page 1 for 33–48 players', () => {
    expect(venueLeaderboardPageColumnCount(33, true)).toBe(4)
    expect(venueLeaderboardPageColumnCount(48, true)).toBe(4)
  })
})

describe('venueLeaderboardSplitPageColumns', () => {
  it('gives each column its own gridRowCount for balanced typography', () => {
    const ranked = mockRows(15).map((row, i) => ({ ...row, rank: i + 1 }))
    const columns = venueLeaderboardSplitPageColumns(ranked, 2)
    expect(columns).toHaveLength(2)
    expect(columns[0]!.players).toHaveLength(8)
    expect(columns[0]!.gridRowCount).toBe(8)
    expect(columns[1]!.players).toHaveLength(7)
    expect(columns[1]!.gridRowCount).toBe(7)
    expect(columns[0]!.rankStart).toBe(1)
    expect(columns[0]!.rankEnd).toBe(8)
    expect(columns[1]!.rankStart).toBe(9)
    expect(columns[1]!.rankEnd).toBe(15)
  })
})
