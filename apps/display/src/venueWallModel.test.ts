import { describe, expect, it } from 'vitest'
import {
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
  type VenueCondenseProgressModel,
} from './venueWallModel'

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
