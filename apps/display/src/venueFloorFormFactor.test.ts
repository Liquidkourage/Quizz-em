import { describe, expect, it } from 'vitest'
import {
  isBroadcastVenueFloorFormFactor,
  isDualTableVenueFloorFormFactor,
  isSingleTableVenueFloorFormFactor,
  resolveVenueFloorFormFactor,
  venueFloorFormFactorBodyKey,
  venueFloorFormFactorIdForCount,
} from './venueFloorFormFactor'

describe('venueFloorFormFactorIdForCount', () => {
  it.each([
    [1, 'broadcast-1'],
    [2, 'hero-3-4'],
    [3, 'hero-3-4'],
    [4, 'hero-3-4'],
    [5, 'banquet-5-8'],
    [8, 'banquet-5-8'],
    [9, 'wall-9-12'],
    [12, 'wall-9-12'],
    [13, 'wall-13-16'],
    [16, 'wall-13-16'],
    [17, 'wall-17-20'],
    [20, 'wall-17-20'],
    [21, 'wall-21-plus'],
    [25, 'wall-21-plus'],
  ] as const)('maps %i tables to %s', (count, id) => {
    expect(venueFloorFormFactorIdForCount(count)).toBe(id)
  })
})

describe('resolveVenueFloorFormFactor', () => {
  it('returns null for zero populated tables', () => {
    expect(resolveVenueFloorFormFactor({ populatedTableCount: 0 })).toBeNull()
  })

  it('uses the same mosaic seating for one table as for two', () => {
    const one = resolveVenueFloorFormFactor({ populatedTableCount: 1 })
    expect(one?.id).toBe('broadcast-1')
    expect(one?.renderer).toBe('mosaic')
    expect(one?.uiScale).toBe('mosaic')
    expect(one?.headline).toBe('full')
    expect(one?.ringMode).toBe('mosaic')
    expect(one?.showdown).toBe('mosaic-overlay')

    const two = resolveVenueFloorFormFactor({ populatedTableCount: 2 })
    expect(two?.id).toBe('hero-3-4')
    expect(two?.renderer).toBe('mosaic')
    expect(two?.ringMode).toBe(one?.ringMode)
  })

  it('falls back to mosaic when host pins a table', () => {
    const pinned = resolveVenueFloorFormFactor({ populatedTableCount: 1, hostFocusTable: 3 })
    expect(pinned?.renderer).toBe('mosaic')
    expect(pinned?.id).toBe('broadcast-1')
    expect(pinned?.headline).toBe('full')
    expect(pinned?.ringMode).toBe('mosaic')
  })

  it('uses mosaic renderer for three or more tables', () => {
    const three = resolveVenueFloorFormFactor({ populatedTableCount: 3 })
    expect(three?.id).toBe('hero-3-4')
    expect(three?.renderer).toBe('mosaic')
    expect(three?.layoutPlan.tableCount).toBe(3)

    const fourteen = resolveVenueFloorFormFactor({ populatedTableCount: 14 })
    expect(fourteen?.id).toBe('wall-13-16')
    expect(fourteen?.layoutPlan.rowSizes).toEqual([5, 4, 5])
  })

  it('always includes a layout plan', () => {
    for (const n of [1, 2, 4, 9, 14, 20]) {
      const ff = resolveVenueFloorFormFactor({ populatedTableCount: n })
      expect(ff?.layoutPlan.tableCount).toBe(n)
    }
  })
})

describe('form factor helpers', () => {
  it('detects broadcast variants', () => {
    const one = resolveVenueFloorFormFactor({ populatedTableCount: 1 })!
    const two = resolveVenueFloorFormFactor({ populatedTableCount: 2 })!
    const three = resolveVenueFloorFormFactor({ populatedTableCount: 3 })!

    expect(isBroadcastVenueFloorFormFactor(one)).toBe(false)
    expect(isSingleTableVenueFloorFormFactor(one)).toBe(true)
    expect(isDualTableVenueFloorFormFactor(one)).toBe(false)

    expect(isDualTableVenueFloorFormFactor(two)).toBe(false)
    expect(isBroadcastVenueFloorFormFactor(two)).toBe(false)
    expect(isBroadcastVenueFloorFormFactor(three)).toBe(false)
  })

  it('builds body animation keys', () => {
    const two = resolveVenueFloorFormFactor({ populatedTableCount: 2 })!
    expect(venueFloorFormFactorBodyKey(two, { showHeroSpotlight: false, hostFocusTable: null })).toBe(
      'floor-hero-3-4'
    )

    const mosaic = resolveVenueFloorFormFactor({ populatedTableCount: 6 })!
    expect(
      venueFloorFormFactorBodyKey(mosaic, { showHeroSpotlight: true, hostFocusTable: 4 })
    ).toBe('spotlight-4')
    expect(
      venueFloorFormFactorBodyKey(mosaic, { showHeroSpotlight: false, hostFocusTable: null })
    ).toBe('floor-banquet-5-8')
  })
})
