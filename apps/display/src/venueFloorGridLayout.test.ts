import { describe, expect, it } from 'vitest'
import {
  applyVenueFloorDenseTuning,
  venueBanquetLayout,
  venueFloorDenseTuning,
  venueFloorGridPaddingRem,
  venueFloorGridPerspectiveStyle,
  venueFloorRowTrackSpec,
  venueFloorSizeSpec,
  venueFloorTableSize,
} from './venueFloorGridLayout'

describe('venueFloorRowTrackSpec', () => {
  it('shrink-wraps a single checkerboard row', () => {
    expect(venueFloorRowTrackSpec(1)).toEqual({
      gridTemplateRows: 'auto',
      shrinkWrapRowHeight: true,
    })
    expect(venueFloorRowTrackSpec(venueBanquetLayout(2).rowCount).shrinkWrapRowHeight).toBe(true)
    expect(venueFloorRowTrackSpec(2).shrinkWrapRowHeight).toBe(false)
  })

  it('shrink-wraps four-row floors so tiles do not stretch with dead space', () => {
    expect(venueFloorRowTrackSpec(4)).toEqual({
      gridTemplateRows: 'repeat(4, auto)',
      shrinkWrapRowHeight: true,
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
  it('maps row count to size tiers', () => {
    expect(venueFloorTableSize(venueBanquetLayout(1))).toBe('hero')
    expect(venueFloorTableSize(venueBanquetLayout(2))).toBe('hero')
    expect(venueFloorTableSize(venueBanquetLayout(4))).toBe('large')
    expect(venueBanquetLayout(8).columns).toBe(4)
    expect(venueBanquetLayout(8).rowCount).toBe(2)
    expect(venueFloorTableSize(venueBanquetLayout(6))).toBe('large')
    expect(venueFloorTableSize(venueBanquetLayout(7))).toBe('large')
    expect(venueFloorTableSize(venueBanquetLayout(9))).toBe('medium')
    expect(venueFloorTableSize(venueBanquetLayout(12))).toBe('medium')
    expect(venueFloorTableSize(venueBanquetLayout(13))).toBe('compact')
    expect(venueFloorTableSize(venueBanquetLayout(16))).toBe('compact')
    expect(venueFloorTableSize(venueBanquetLayout(17))).toBe('micro')
    expect(venueFloorTableSize(venueBanquetLayout(20))).toBe('micro')
  })

  it('tightens gaps as rows increase', () => {
    const hero = venueFloorSizeSpec(venueBanquetLayout(1))
    const large = venueFloorSizeSpec(venueBanquetLayout(4))
    const medium = venueFloorSizeSpec(venueBanquetLayout(9))
    const compact = venueFloorSizeSpec(venueBanquetLayout(16))
    const micro = venueFloorSizeSpec(venueBanquetLayout(20))

    expect(hero.rowGapRem).toBeGreaterThan(large.rowGapRem)
    expect(medium.rowGapRem).toBeGreaterThan(compact.rowGapRem)
    expect(compact.rowGapRem).toBeGreaterThan(micro.rowGapRem)

    expect(large.showdownBrief).toBe(true)
    expect(medium.showdownBrief).toBe(true)
    expect(medium.honeycombFillHeight).toBe(false)
    expect(micro.honeycombFillHeight).toBe(false)
    expect(compact.compactChrome).toBe(true)
    expect(compact.showPotSubtitle).toBe(true)
    expect(micro.showPotSubtitle).toBe(false)
    expect(micro.showdownBrief).toBe(true)
    expect(venueFloorGridPaddingRem(4).bottom).toBeGreaterThan(venueFloorGridPaddingRem(2).bottom)
  })
})

describe('venueFloorDenseTuning', () => {
  it('tightens four-row floors when a headline is showing', () => {
    const layout = venueBanquetLayout(20)
    expect(layout.rowCount).toBe(4)
    const tuned = venueFloorDenseTuning(layout, { withHeadline: true })
    expect(tuned).not.toBeNull()
    const micro = venueFloorSizeSpec(layout)
    const applied = applyVenueFloorDenseTuning(micro, tuned)
    expect(applied.rowGapRem).toBeGreaterThan(micro.rowGapRem)
    expect(applied.cellGapRem).toBeGreaterThan(micro.cellGapRem)
    expect(applied.potClass).toContain('2.05vmin')
    expect(applied.tileInsetClass).toContain('88%')
    expect(tuned!.paddingBottomRem).toBeLessThan(venueFloorGridPaddingRem(4).bottom)
  })

  it('is null for three-row floors', () => {
    expect(venueFloorDenseTuning(venueBanquetLayout(12))).toBeNull()
  })
})
