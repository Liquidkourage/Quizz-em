import { describe, expect, it } from 'vitest'
import {
  applyVenueFloorDenseTuning,
  venueBanquetLayout,
  venueFloorDenseTuning,
  venueFloorGridPaddingForLayout,
  venueFloorSpacingSpec,
  VENUE_FLOOR_GRID_BOTTOM_SAFE_REM,
  venueFloorGridPaddingRem,
  venueFloorGridPerspectiveStyle,
  venueFloorMosaicTypography,
  venueFloorPublicTypographyTier,
  venueFloorRowTrackSpec,
  venueFloorSizeSpec,
  venueFloorTableSize,
  venueMosaicTileTypographyStyle,
  VENUE_FLOOR_MOSAIC_HEADER_TYPE,
} from './venueFloorGridLayout'

describe('venueFloorRowTrackSpec', () => {
  it('shrink-wraps a single row without headline', () => {
    expect(venueFloorRowTrackSpec(1)).toEqual({
      gridTemplateRows: 'auto',
      shrinkWrapRowHeight: true,
      fillRowHeight: false,
    })
  })

  it('fills a single row when headline reserves top space', () => {
    expect(venueFloorRowTrackSpec(1, { withHeadline: true })).toEqual({
      gridTemplateRows: 'minmax(0, 1fr)',
      shrinkWrapRowHeight: false,
      fillRowHeight: true,
    })
  })

  it('fills equal row slots for multi-row floors', () => {
    expect(venueFloorRowTrackSpec(3)).toEqual({
      gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
      shrinkWrapRowHeight: false,
      fillRowHeight: true,
    })
  })
})

describe('venueFloorGridPerspectiveStyle', () => {
  it('drops 3D tilt on dense four-row floors', () => {
    expect(venueFloorGridPerspectiveStyle(3).transform).toBe('rotateX(3deg)')
    expect(venueFloorGridPerspectiveStyle(4)).toEqual({})
  })
})

describe('venueFloorTableSize', () => {
  it('maps table count to density tiers', () => {
    expect(venueFloorTableSize(1)).toBe('hero')
    expect(venueFloorTableSize(2)).toBe('hero')
    expect(venueFloorTableSize(4)).toBe('large')
    expect(venueBanquetLayout(8).columns).toBe(4)
    expect(venueBanquetLayout(8).rowCount).toBe(2)
    expect(venueFloorTableSize(6)).toBe('large')
    expect(venueFloorTableSize(9)).toBe('medium')
    expect(venueFloorTableSize(12)).toBe('medium')
    expect(venueFloorTableSize(13)).toBe('compact')
    expect(venueFloorTableSize(16)).toBe('micro')
    expect(venueFloorTableSize(20)).toBe('micro')
  })

  it('tightens gaps as density increases', () => {
    const hero = venueFloorSizeSpec(1)
    const large = venueFloorSizeSpec(4)
    const medium = venueFloorSizeSpec(9)
    const compact = venueFloorSizeSpec(13)
    const micro = venueFloorSizeSpec(20)

    expect(hero.rowGapRem).toBeGreaterThan(large.rowGapRem)
    expect(medium.rowGapRem).toBeGreaterThan(compact.rowGapRem)
    expect(compact.rowGapRem).toBeGreaterThan(micro.rowGapRem)

    expect(large.showdownBrief).toBe(true)
    expect(medium.showdownBrief).toBe(true)
    expect(micro.honeycombFillHeight).toBe(false)
    expect(compact.compactChrome).toBe(true)
    expect(micro.showPotSubtitle).toBe(false)
    expect(venueFloorGridPaddingRem(4).bottom).toBeGreaterThan(venueFloorGridPaddingRem(2).bottom)
  })
})

describe('venueBanquetLayout', () => {
  it('selects a 5–4–5 stagger for fourteen tables', () => {
    expect(venueBanquetLayout(14)).toMatchObject({
      columns: 5,
      rowCount: 3,
      rowSizes: [5, 4, 5],
      tableCount: 14,
      staggered: true,
    })
  })
})

describe('venueFloorPublicTypographyTier', () => {
  it('maps table counts to typography tiers', () => {
    expect(venueFloorPublicTypographyTier(4)).toBe('spacious')
    expect(venueFloorPublicTypographyTier(8)).toBe('spacious')
    expect(venueFloorPublicTypographyTier(9)).toBe('standard')
    expect(venueFloorPublicTypographyTier(14)).toBe('standard')
    expect(venueFloorPublicTypographyTier(15)).toBe('standard')
    expect(venueFloorPublicTypographyTier(16)).toBe('compact')
    expect(venueFloorPublicTypographyTier(20)).toBe('compact')
  })
})

describe('venueFloorMosaicTypography', () => {
  it('returns tier-specific mosaic type scales', () => {
    const standard = venueFloorMosaicTypography(14)
    const compact = venueFloorMosaicTypography(18)
    expect(standard.rootClass).toBe('venue-floor-typography-standard')
    expect(standard.feltPot).toContain('vfd-mosaic-stack')
    expect(standard.actingName).toContain('vfd-mosaic-player-name')
    expect(VENUE_FLOOR_MOSAIC_HEADER_TYPE.seatInitials).toBe('vfd-mosaic-seat-initial')
    expect(VENUE_FLOOR_MOSAIC_HEADER_TYPE.noMoreBetsWatermark).toBe('vfd-mosaic-watermark')
    expect(compact.rootClass).toBe('venue-floor-typography-compact')
    expect(standard.noMoreBetsOffsetClass).not.toBe(compact.noMoreBetsOffsetClass)
    expect(standard.feltMaxHeightClass).toBe('vfd-mosaic-felt-cap')
  })
})

describe('venueMosaicTileTypographyStyle', () => {
  it('scales stack size with measured tile width up to the large-density cap', () => {
    const narrow = venueMosaicTileTypographyStyle('standard', 220, 'large') as Record<string, string>
    const wide = venueMosaicTileTypographyStyle('standard', 440, 'large') as Record<string, string>
    const huge = venueMosaicTileTypographyStyle('standard', 660, 'large') as Record<string, string>
    expect(Number.parseFloat(narrow['--vfd-stack-size'])).toBe(41)
    expect(Number.parseFloat(wide['--vfd-stack-size'])).toBe(55)
    expect(Number.parseFloat(huge['--vfd-stack-size'])).toBe(55)
  })

  it('returns empty style until tile width is known', () => {
    expect(venueMosaicTileTypographyStyle('standard', 0, 'large')).toEqual({})
  })
})

describe('venueFloorSpacingSpec', () => {
  it('tightens multi-row floors when a headline is showing', () => {
    const layout = venueBanquetLayout(20)
    const spec = venueFloorSpacingSpec(20, layout, { withHeadline: true })
    expect(spec.rowGapRem).toBe(0.65)
    expect(spec.cellGapRem).toBe(0.82)
    const padding = venueFloorGridPaddingForLayout(layout.rowCount, { withHeadline: true })
    expect(padding.bottom).toBe(VENUE_FLOOR_GRID_BOTTOM_SAFE_REM)
  })

  it('matches base size spec without headline', () => {
    const layout = venueBanquetLayout(12)
    const base = venueFloorSizeSpec(12)
    const spec = venueFloorSpacingSpec(12, layout, { withHeadline: false })
    expect(spec).toEqual(base)
  })
})

describe('venueFloorDenseTuning (deprecated shim)', () => {
  it('tightens multi-row floors when a headline is showing', () => {
    const layout = venueBanquetLayout(20)
    const tuned = venueFloorDenseTuning(layout, { withHeadline: true })
    expect(tuned).not.toBeNull()
    const micro = venueFloorSizeSpec(20)
    const applied = applyVenueFloorDenseTuning(micro, tuned)
    expect(applied.rowGapRem).toBe(0.65)
    expect(applied.cellGapRem).toBe(0.82)
    expect(applied.tileInsetClass).toBe('')
    expect(tuned!.paddingBottomRem).toBe(VENUE_FLOOR_GRID_BOTTOM_SAFE_REM)
  })

  it('is null without a headline', () => {
    expect(venueFloorDenseTuning(venueBanquetLayout(12), { withHeadline: false })).toBeNull()
  })
})
