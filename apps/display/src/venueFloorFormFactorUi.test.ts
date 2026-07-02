import { describe, expect, it } from 'vitest'
import { resolveVenueFloorFormFactor } from './venueFloorFormFactor'
import {
  showdownLayoutTableCountFromFormFactor,
  showdownStageViewportFromFormFactor,
  venueFloorFormFactorCompactHeadline,
  venueFloorFormFactorUltraCompactHeadline,
  venueFloorFormFactorUsesBroadcastHeadline,
  venueFloorFormFactorUsesBroadcastUiScale,
  venueFloorLayoutTableCount,
} from './venueFloorFormFactorUi'

describe('venueFloorFormFactorUi', () => {
  it('derives broadcast headline and ui scale from spec', () => {
    const broadcast = resolveVenueFloorFormFactor({ populatedTableCount: 1 })!
    const mosaic = resolveVenueFloorFormFactor({ populatedTableCount: 6 })!

    expect(venueFloorFormFactorUsesBroadcastHeadline(broadcast)).toBe(true)
    expect(venueFloorFormFactorUsesBroadcastUiScale(broadcast)).toBe(true)
    expect(venueFloorFormFactorUsesBroadcastHeadline(mosaic)).toBe(false)
    expect(venueFloorFormFactorUsesBroadcastUiScale(mosaic)).toBe(false)
  })

  it('maps showdown viewport from form factor', () => {
    const one = resolveVenueFloorFormFactor({ populatedTableCount: 1 })!
    const nine = resolveVenueFloorFormFactor({ populatedTableCount: 9 })!

    expect(showdownStageViewportFromFormFactor(one)).toBe('broadcast')
    expect(showdownStageViewportFromFormFactor(nine)).toBe('mosaic')
    expect(showdownLayoutTableCountFromFormFactor(one)).toBe(1)
    expect(showdownLayoutTableCountFromFormFactor(resolveVenueFloorFormFactor({ populatedTableCount: 2 })!)).toBe(2)
  })

  it('uses layout table count max for typography input', () => {
    const ff = resolveVenueFloorFormFactor({ populatedTableCount: 12 })!
    expect(venueFloorLayoutTableCount(ff, 14)).toBe(14)
    expect(venueFloorLayoutTableCount(ff, null)).toBe(12)
  })

  it('flags compact headline tiers from form factor id', () => {
    const wall14 = resolveVenueFloorFormFactor({ populatedTableCount: 14 })!
    const wall18 = resolveVenueFloorFormFactor({ populatedTableCount: 18 })!
    const banquet = resolveVenueFloorFormFactor({ populatedTableCount: 6 })!

    expect(venueFloorFormFactorCompactHeadline(wall14, 14)).toBe(true)
    expect(venueFloorFormFactorUltraCompactHeadline(wall14, 14)).toBe(false)
    expect(venueFloorFormFactorUltraCompactHeadline(wall18, 18)).toBe(true)
    expect(venueFloorFormFactorCompactHeadline(banquet, 6)).toBe(false)
  })
})
