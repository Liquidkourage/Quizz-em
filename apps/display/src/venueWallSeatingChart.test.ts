import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'
import {
  seatingChartTablesFromTiles,
  venueWallHasLiveTiles,
  venueWallShowSeatingChart,
} from './venueWallModel'

function tile(partial: Partial<DisplayVenueTileSnapshot> & { tableNum: number }): DisplayVenueTileSnapshot {
  return {
    seated: 2,
    pot: 0,
    phase: 'lobby',
    seatNames: ['Alice', 'Bob', '', '', '', '', '', ''],
    seatBankrolls: [1000, 1000, 0, 0, 0, 0, 0, 0],
    ...partial,
  }
}

function wall(overrides: Partial<DisplayVenueWallSnapshot> = {}): DisplayVenueWallSnapshot {
  return {
    tiles: [tile({ tableNum: 1 }), tile({ tableNum: 2 })],
    headlineQuestionText: null,
    answerDeadlineMs: null,
    lobbyPlayerCount: 0,
    totalSeatedAtTables: 4,
    showAudienceWelcome: false,
    ...overrides,
  }
}

describe('venueWallShowSeatingChart', () => {
  it('is true after assign when all felts are lobby with seated players', () => {
    const w = wall()
    const rows = w.tiles
    expect(venueWallHasLiveTiles(w)).toBe(true)
    expect(venueWallShowSeatingChart(w, rows)).toBe(true)
  })

  it('is false while audience welcome is still showing', () => {
    const w = wall({ showAudienceWelcome: true })
    expect(venueWallShowSeatingChart(w, w.tiles)).toBe(false)
  })

  it('is false once any table leaves lobby', () => {
    const w = wall({
      tiles: [tile({ tableNum: 1, phase: 'question' }), tile({ tableNum: 2 })],
    })
    expect(venueWallShowSeatingChart(w, w.tiles)).toBe(false)
  })
})

describe('seatingChartTablesFromTiles', () => {
  it('groups names by table', () => {
    const tables = seatingChartTablesFromTiles([
      tile({ tableNum: 2 }),
      tile({ tableNum: 1, seatNames: ['Zed', '', '', '', '', '', '', ''] }),
    ])
    expect(tables.map((t) => t.tableNum)).toEqual([1, 2])
    expect(tables[0]!.seats[0]!.name).toBe('Zed')
  })
})
