import { describe, expect, it } from 'vitest'
import {
  chunkTilesIntoRowGroups,
  selectVenueFloorLayout,
  venueFloorCardSlotWidthCss,
  venueFloorDensityForCount,
  venueFloorPreferredColumns,
} from './venueFloorLayout'

describe('venueFloorPreferredColumns', () => {
  it('prefers wider grids as table count grows', () => {
    expect(venueFloorPreferredColumns(1)).toBe(1)
    expect(venueFloorPreferredColumns(4)).toBe(2)
    expect(venueFloorPreferredColumns(6)).toBe(3)
    expect(venueFloorPreferredColumns(8)).toBe(4)
    expect(venueFloorPreferredColumns(14)).toBe(5)
    expect(venueFloorPreferredColumns(20)).toBe(5)
  })
})

describe('chunkTilesIntoRowGroups', () => {
  it('splits tiles into explicit row sizes', () => {
    const tiles = Array.from({ length: 14 }, (_, i) => i + 1)
    expect(chunkTilesIntoRowGroups(tiles, [5, 4, 5]).map((r) => r.length)).toEqual([5, 4, 5])
  })
})

describe('selectVenueFloorLayout', () => {
  const counts = [1, 2, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 16, 20] as const

  it.each(counts)('returns a valid plan for %i tables', (tableCount) => {
    const plan = selectVenueFloorLayout({ tableCount })
    expect(plan.tableCount).toBe(tableCount)
    expect(plan.columns).toBeGreaterThan(0)
    expect(plan.rowSizes.reduce((sum, n) => sum + n, 0)).toBe(tableCount)
    expect(plan.rowCount).toBe(plan.rowSizes.length)
    expect(plan.density).toBe(venueFloorDensityForCount(tableCount))
  })

  it('uses a 5–4–5 stagger for fourteen tables', () => {
    const plan = selectVenueFloorLayout({ tableCount: 14 })
    expect(plan.rowSizes).toEqual([5, 4, 5])
    expect(plan.rowCount).toBe(3)
    expect(plan.columns).toBe(5)
    expect(plan.staggered).toBe(true)
  })

  it('prefers three by two for six tables', () => {
    const plan = selectVenueFloorLayout({ tableCount: 6 })
    expect(plan.columns).toBe(3)
    expect(plan.rowCount).toBe(2)
  })

  it('prefers a staggered four-three for seven tables', () => {
    const plan = selectVenueFloorLayout({ tableCount: 7 })
    expect(plan.rowSizes).toEqual([4, 3])
    expect(plan.staggered).toBe(true)
  })

  it('prefers four by two for eight tables', () => {
    const plan = selectVenueFloorLayout({ tableCount: 8 })
    expect(plan.columns).toBe(4)
    expect(plan.rowCount).toBe(2)
  })

  it('keeps fourteen tables on three rows at 16:9 with headline', () => {
    const plan = selectVenueFloorLayout({
      tableCount: 14,
      withHeadline: true,
      viewport: { widthPx: 1920, heightPx: 1080 },
    })
    expect(plan.rowSizes).toEqual([5, 4, 5])
    expect(plan.rowCount).toBe(3)
  })
})

describe('venueFloorCardSlotWidthCss', () => {
  it('derives equal slot widths for centered partial rows', () => {
    expect(venueFloorCardSlotWidthCss(5, 0.78)).toBe('calc((100% - (5 - 1) * 0.78rem) / 5)')
  })
})
