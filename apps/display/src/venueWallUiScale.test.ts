import { describe, expect, it } from 'vitest'
import { VENUE_WALL_UI_SCALE, venueWallCssPxForRendered } from './venueWallUiScale'

describe('venueWallCssPxForRendered', () => {
  it('compensates for venue-wall zoom so CSS px hits rendered targets', () => {
    expect(VENUE_WALL_UI_SCALE).toBe(0.88)
    expect(venueWallCssPxForRendered(24)).toBeCloseTo(27.27, 1)
    expect(venueWallCssPxForRendered(36)).toBeCloseTo(40.91, 1)
    expect(venueWallCssPxForRendered(34) * VENUE_WALL_UI_SCALE).toBeCloseTo(34, 1)
  })
})
