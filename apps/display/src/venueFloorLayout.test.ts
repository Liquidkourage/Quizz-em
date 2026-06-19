import { describe, expect, it } from 'vitest'
import {
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

describe('selectVenueFloorLayout', () => {
  const counts = [1, 2, 4, 5, 6, 8, 10, 12, 13, 14, 15, 16, 20] as const

  it.each(counts)('returns a valid plan for %i tables', (tableCount) => {
    const plan = selectVenueFloorLayout({ tableCount })
    expect(plan.tableCount).toBe(tableCount)
    expect(plan.columns).toBeGreaterThan(0)
    expect(plan.rowCount).toBe(Math.ceil(tableCount / plan.columns))
    expect(plan.density).toBe(venueFloorDensityForCount(tableCount))
  })

  it('uses five columns and three rows for fourteen tables', () => {
    const plan = selectVenueFloorLayout({ tableCount: 14 })
    expect(plan.columns).toBe(5)
    expect(plan.rowCount).toBe(3)
  })

  it('prefers three by two for six tables', () => {
    const plan = selectVenueFloorLayout({ tableCount: 6 })
    expect(plan.columns).toBe(3)
    expect(plan.rowCount).toBe(2)
  })

  it('prefers four by two for eight tables', () => {
    const plan = selectVenueFloorLayout({ tableCount: 8 })
    expect(plan.columns).toBe(4)
    expect(plan.rowCount).toBe(2)
  })

  it('considers viewport height when headline is visible', () => {
    const tight = selectVenueFloorLayout({
      tableCount: 14,
      withHeadline: true,
      viewport: { widthPx: 1366, heightPx: 768 },
    })
    const roomy = selectVenueFloorLayout({
      tableCount: 14,
      withHeadline: true,
      viewport: { widthPx: 2560, heightPx: 1440 },
    })
    expect(tight.columns).toBeGreaterThanOrEqual(4)
    expect(roomy.columns).toBeGreaterThanOrEqual(4)
    expect(tight.rowCount).toBeLessThanOrEqual(4)
    expect(roomy.rowCount).toBeLessThanOrEqual(3)
  })
})

describe('venueFloorCardSlotWidthCss', () => {
  it('derives equal slot widths for centered partial rows', () => {
    expect(venueFloorCardSlotWidthCss(5, 0.45)).toBe('calc((100% - (5 - 1) * 0.45rem) / 5)')
  })
})
