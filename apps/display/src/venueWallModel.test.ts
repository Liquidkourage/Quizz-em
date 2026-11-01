import { describe, expect, it } from 'vitest'
import {
  venueAllTablesAnswering,
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
  venuePublicAnswerReleased,
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

describe('venuePublicAnswerReleased', () => {
  it('keeps the correct answer off the TV while anyone is still guessing', () => {
    expect(
      venuePublicAnswerReleased([
        tile('answering', 6),
        { ...tile('showdown', 6), tableNum: 2, showdownAnswer: 1440 },
      ]),
    ).toBe(false)
  })

  it('keeps the correct answer off the TV during the answer window', () => {
    expect(venuePublicAnswerReleased([tile('answering', 6), { ...tile('answering', 5), tableNum: 2 }])).toBe(
      false,
    )
  })

  it('shows the correct answer once every seated table is in results', () => {
    expect(venuePublicAnswerReleased([tile('showdown', 6), { ...tile('reveal', 5), tableNum: 2 }])).toBe(true)
  })
})

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
