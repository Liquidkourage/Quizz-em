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
    handsUntilShuffle: 3,
    shuffleEveryHands: 5,
    shuffleFillPct: 40,
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
  it('shows remaining and shuffle countdown', () => {
    expect(venueHeadlineCondenseCaptionParts(model({}))).toEqual([
      '91 remaining',
      'shuffle in 3 hands',
    ])
    expect(venueHeadlineCondenseCaption(model({}))).toBe('91 remaining · Shuffle in 3 hands')
  })

  it('shows shuffle next hand when one hand away', () => {
    expect(venueHeadlineCondenseCaptionParts(model({ handsUntilShuffle: 1 }))).toEqual([
      '91 remaining',
      'shuffle next hand',
    ])
  })

  it('shows only remaining on the final table', () => {
    expect(
      venueHeadlineCondenseCaptionParts(model({ liveTables: 1, handsUntilShuffle: null })),
    ).toEqual(['91 remaining'])
  })
})
