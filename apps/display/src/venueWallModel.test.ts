import { describe, expect, it } from 'vitest'
import {
  venueAllTablesAnswering,
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
  type VenueCondenseProgressModel,
} from './venueWallModel'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

function tile(phase: string, seated = 6): DisplayVenueTileSnapshot {
  return { tableNum: 1, phase, seated, pot: 0, seatNames: [], seatBankrolls: [] } as DisplayVenueTileSnapshot
}

function model(overrides: Partial<VenueCondenseProgressModel>): VenueCondenseProgressModel {
  return {
    survivors: 91,
    peakSurvivors: 120,
    liveTables: 12,
    fillPct: 75,
    marks: [],
    nextAt: 74,
    nextToTables: 10,
    ...overrides,
  }
}

describe('venueAllTablesAnswering', () => {
  it('is true when every populated table is answering', () => {
    expect(
      venueAllTablesAnswering([
        tile('answering', 6),
        tile('answering', 5),
      ]),
    ).toBe(true)
  })

  it('is false when any table is still wagering', () => {
    expect(
      venueAllTablesAnswering([
        tile('answering', 6),
        tile('betting', 6),
      ]),
    ).toBe(false)
  })
})

describe('venueHeadlineCondenseCaptionParts', () => {
  it('shows remaining and re-seating threshold without table count', () => {
    expect(venueHeadlineCondenseCaptionParts(model({}))).toEqual([
      '91 remaining',
      're-seating at 74',
    ])
    expect(venueHeadlineCondenseCaption(model({}))).toBe('91 remaining · Re-seating at 74')
  })

  it('shows re-seating now when at or below the threshold', () => {
    expect(venueHeadlineCondenseCaptionParts(model({ survivors: 74 }))).toEqual([
      '74 remaining',
      're-seating now',
    ])
  })

  it('shows only remaining on the final table', () => {
    expect(venueHeadlineCondenseCaptionParts(model({ liveTables: 1, nextAt: null }))).toEqual([
      '91 remaining',
    ])
  })
})
