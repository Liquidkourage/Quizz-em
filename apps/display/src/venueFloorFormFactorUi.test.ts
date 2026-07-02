import { describe, expect, it } from 'vitest'
import { resolveVenueFloorSpec } from './venueFloorSpec'
import {
  showdownLayoutTableCountFromSpec,
  showdownStageViewportFromSpec,
  venueFloorSpecMainPaddingClass,
  venueFloorSpecUsesBroadcastHeadline,
  venueFloorSpecUsesBroadcastUiScale,
} from './venueFloorSpec'

describe('venueFloorSpec UI accessors', () => {
  it('derives broadcast headline and ui scale from spec', () => {
    const broadcast = resolveVenueFloorSpec({ populatedTableCount: 1 })!
    const mosaic = resolveVenueFloorSpec({ populatedTableCount: 6 })!

    expect(venueFloorSpecUsesBroadcastHeadline(broadcast)).toBe(true)
    expect(venueFloorSpecUsesBroadcastUiScale(broadcast)).toBe(true)
    expect(venueFloorSpecUsesBroadcastHeadline(mosaic)).toBe(false)
    expect(venueFloorSpecUsesBroadcastUiScale(mosaic)).toBe(false)
  })

  it('maps showdown viewport from spec', () => {
    const one = resolveVenueFloorSpec({ populatedTableCount: 1 })!
    const nine = resolveVenueFloorSpec({ populatedTableCount: 9 })!

    expect(showdownStageViewportFromSpec(one)).toBe('broadcast')
    expect(showdownStageViewportFromSpec(nine)).toBe('mosaic')
    expect(showdownLayoutTableCountFromSpec(one)).toBe(1)
    expect(showdownLayoutTableCountFromSpec(resolveVenueFloorSpec({ populatedTableCount: 2 })!)).toBe(2)
  })

  it('flags compact headline tiers from spec', () => {
    const wall14 = resolveVenueFloorSpec({ populatedTableCount: 14 })!
    const wall18 = resolveVenueFloorSpec({ populatedTableCount: 18 })!
    const banquet = resolveVenueFloorSpec({ populatedTableCount: 6 })!

    expect(wall14.compactHeadline).toBe(true)
    expect(wall14.ultraCompactHeadline).toBe(false)
    expect(wall18.ultraCompactHeadline).toBe(true)
    expect(banquet.compactHeadline).toBe(false)
    expect(venueFloorSpecMainPaddingClass(banquet)).toContain('px-3')
  })
})
