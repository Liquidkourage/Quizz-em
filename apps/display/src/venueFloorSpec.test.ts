import { describe, expect, it } from 'vitest'
import {
  buildVenueFloorHeadlineMeta,
  resolveVenueFloorSpec,
  resolveVenueFloorSpecForCompanionGrid,
  resolveVenueFloorSpecForHeroFeatured,
  venueFloorSpecIdForCount,
  venueFloorSpecUsesBroadcastUiScale,
} from './venueFloorSpec'
import {
  venueFloorFeltDensityForSizingCount,
  venueFloorMosaicTypographyTierForSizingCount,
  venueFloorShowdownStageDensityForSizingCount,
} from './venueFloorSpecCounts'

describe('venueFloorSpecIdForCount', () => {
  it.each([
    [1, 'broadcast-1'],
    [2, 'broadcast-2'],
    [3, 'hero-3-4'],
    [8, 'banquet-5-8'],
    [14, 'wall-13-16'],
    [21, 'wall-21-plus'],
  ] as const)('maps %i tables to %s', (count, id) => {
    expect(venueFloorSpecIdForCount(count)).toBe(id)
  })
})

describe('resolveVenueFloorSpec', () => {
  it('returns null for zero populated tables', () => {
    expect(resolveVenueFloorSpec({ populatedTableCount: 0 })).toBeNull()
  })

  it('uses broadcast renderer for one and two tables without host focus', () => {
    const one = resolveVenueFloorSpec({ populatedTableCount: 1 })!
    expect(one.id).toBe('broadcast-1')
    expect(one.renderer).toBe('broadcast')
    expect(one.typographyProfile).toBe('broadcast')
    expect(one.typographyRootClass).toBe('venue-floor-typography-broadcast')
    expect(one.showdown).toBe('broadcast-reveal')

    const two = resolveVenueFloorSpec({ populatedTableCount: 2 })!
    expect(two.id).toBe('broadcast-2')
    expect(two.broadcastDensity).toBe('dual')
  })

  it('uses sizing table count for mosaic typography and felt density', () => {
    const spec = resolveVenueFloorSpec({
      populatedTableCount: 3,
      venueLiveTableCount: 14,
    })!
    expect(spec.id).toBe('hero-3-4')
    expect(spec.sizingTableCount).toBe(14)
    expect(spec.mosaicTypographyTier).toBe('standard')
    expect(spec.feltDensity).toBe('compact')
    expect(spec.compactHeadline).toBe(false)
  })

  it('falls back to mosaic when host pins a table on broadcast counts', () => {
    const pinned = resolveVenueFloorSpec({ populatedTableCount: 1, hostFocusTable: 3 })!
    expect(pinned.renderer).toBe('mosaic')
    expect(pinned.headline).toBe('full')
    expect(pinned.typographyProfile).not.toBe('broadcast')
    expect(venueFloorSpecUsesBroadcastUiScale(pinned)).toBe(false)
  })

  it('builds broadcast meta from spec template', () => {
    const spec = resolveVenueFloorSpec({ populatedTableCount: 1 })!
    expect(
      buildVenueFloorHeadlineMeta(spec, [{ tableNum: 1, seated: 7 } as never], {
        survivors: 7,
        peakSurvivors: 20,
        liveTables: 1,
        fillPct: 35,
        handsUntilShuffle: null,
        shuffleEveryHands: 5,
        shuffleFillPct: 0,
      })
    ).toBe('Final table · 7 players · 7 left')
  })
})

describe('venueFloorSpecCounts', () => {
  it('matches legacy density breakpoints', () => {
    expect(venueFloorFeltDensityForSizingCount(1)).toBe('hero')
    expect(venueFloorFeltDensityForSizingCount(9)).toBe('medium')
    expect(venueFloorMosaicTypographyTierForSizingCount(8)).toBe('spacious')
    expect(venueFloorMosaicTypographyTierForSizingCount(16)).toBe('compact')
    expect(venueFloorShowdownStageDensityForSizingCount(1)).toBe('hero')
    expect(venueFloorShowdownStageDensityForSizingCount(20)).toBe('dense')
  })
})

describe('venueFloorSpec helpers', () => {
  it('derives spacious tile chrome from felt density and populated count', () => {
    const parent = resolveVenueFloorSpec({ populatedTableCount: 20 })!
    expect(parent.spaciousTileChrome).toBe(false)

    const banquet = resolveVenueFloorSpec({ populatedTableCount: 6 })!
    expect(banquet.spaciousTileChrome).toBe(true)
  })

  it('companion grid inherits parent sizing with companion layout count', () => {
    const parent = resolveVenueFloorSpec({ populatedTableCount: 5, venueLiveTableCount: 18 })!
    const companion = resolveVenueFloorSpecForCompanionGrid(parent, 3)
    expect(companion.populatedTableCount).toBe(3)
    expect(companion.sizingTableCount).toBe(18)
    expect(companion.mosaicTypographyTier).toBe('compact')
    expect(companion.id).toBe('hero-3-4')
  })

  it('hero featured tile uses hero felt with parent typography sizing', () => {
    const parent = resolveVenueFloorSpec({ populatedTableCount: 14 })!
    const hero = resolveVenueFloorSpecForHeroFeatured(parent)
    expect(hero.feltDensity).toBe('hero')
    expect(hero.spaciousTileChrome).toBe(true)
    expect(hero.mosaicTypographyTier).toBe(parent.mosaicTypographyTier)
  })
})
