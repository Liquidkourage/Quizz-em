import { describe, expect, it } from 'vitest'
import {
  venueBanquetLayout,
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
    expect(medium.honeycombFillHeight).toBe(true)
    expect(compact.compactChrome).toBe(true)
    expect(micro.showdownBrief).toBe(true)
  })
})
