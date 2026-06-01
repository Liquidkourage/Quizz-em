import { describe, expect, it } from 'vitest'
import {
  buildVenueWallViewPlaylist,
  venueActionTickerLine,
  venueActionTickerLines,
} from './venueWallViewCycle'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

function tile(partial: Partial<DisplayVenueTileSnapshot> & { tableNum: number }): DisplayVenueTileSnapshot {
  return {
    seated: 4,
    pot: 100,
    phase: 'betting',
    seatNames: ['Alice', 'Bob', 'Carol', 'Dan', '', '', '', ''],
    seatBankrolls: [500, 500, 500, 500, 0, 0, 0, 0],
    isBettingOpen: true,
    currentPlayerIndex: 1,
    actingCallAmount: 50,
    ...partial,
  }
}

describe('venueActionTickerLine', () => {
  it('formats an open wagering call line', () => {
    const line = venueActionTickerLine(
      tile({ tableNum: 3, currentPlayerIndex: 1, actingCallAmount: 75 }),
    )
    expect(line).toBe('Table 3 · Bob to call: $75')
  })

  it('returns null when betting is closed', () => {
    expect(venueActionTickerLine(tile({ tableNum: 1, isBettingOpen: false }))).toBeNull()
  })
})

describe('buildVenueWallViewPlaylist', () => {
  it('locks to hero when host pins a table', () => {
    const plan = buildVenueWallViewPlaylist({
      tileRows: [tile({ tableNum: 1 }), tile({ tableNum: 2 })],
      hostFocusTable: 2,
      showShowdownTour: false,
      headlineAnswering: false,
      answerDeadlineMs: null,
    })
    expect(plan.views).toEqual(['heroSpotlight'])
    expect(plan.locked).toBe(true)
  })

  it('cycles floor and showdown spotlight on multi-table showdown', () => {
    const rows = [
      tile({ tableNum: 1, phase: 'showdown' }),
      tile({ tableNum: 2, phase: 'showdown' }),
      tile({ tableNum: 3, phase: 'showdown' }),
      tile({ tableNum: 4, phase: 'showdown' }),
      tile({ tableNum: 5, phase: 'showdown' }),
    ]
    const plan = buildVenueWallViewPlaylist({
      tileRows: rows,
      hostFocusTable: null,
      showShowdownTour: true,
      headlineAnswering: false,
      answerDeadlineMs: null,
    })
    expect(plan.views).toEqual(['floor', 'showdownSpotlight'])
  })

  it('includes action ticker when many tables have open action', () => {
    const rows = Array.from({ length: 8 }, (_, i) => tile({ tableNum: i + 1 }))
    const plan = buildVenueWallViewPlaylist({
      tileRows: rows,
      hostFocusTable: null,
      showShowdownTour: false,
      headlineAnswering: false,
      answerDeadlineMs: null,
    })
    expect(plan.views).toEqual(['floor', 'actionTicker', 'heroSpotlight'])
  })

  it('keeps a stable wagering playlist key while open-action count fluctuates', () => {
    const rows = Array.from({ length: 8 }, (_, i) => tile({ tableNum: i + 1 }))
    const full = buildVenueWallViewPlaylist({
      tileRows: rows,
      hostFocusTable: null,
      showShowdownTour: false,
      headlineAnswering: false,
      answerDeadlineMs: null,
    })
    const fewerActions = buildVenueWallViewPlaylist({
      tileRows: rows.map((r, i) => (i === 0 ? { ...r, isBettingOpen: false } : r)),
      hostFocusTable: null,
      showShowdownTour: false,
      headlineAnswering: false,
      answerDeadlineMs: null,
    })
    expect(full.key).toBe('wagering-8')
    expect(fewerActions.key).toBe('wagering-8')
    expect(fewerActions.views).toEqual(full.views)
  })

  it('stays on floor for small venues', () => {
    const plan = buildVenueWallViewPlaylist({
      tileRows: [tile({ tableNum: 1 }), tile({ tableNum: 2 })],
      hostFocusTable: null,
      showShowdownTour: false,
      headlineAnswering: false,
      answerDeadlineMs: null,
    })
    expect(plan.views).toEqual(['floor'])
    expect(plan.locked).toBe(true)
  })
})

describe('venueActionTickerLines', () => {
  it('collects lines for every table on the clock', () => {
    const lines = venueActionTickerLines([tile({ tableNum: 1 }), tile({ tableNum: 2, isBettingOpen: false })])
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('Table 1')
  })
})
