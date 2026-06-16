import { describe, expect, it } from 'vitest'
import {
  SEATING_CHART_PAGE_TABLES,
  seatingChartPageCount,
  seatingChartPageLabel,
  seatingChartPageTables,
  seatingChartWFormationLayout,
} from './venueSeatingChartCarousel'

describe('seatingChartPageCount', () => {
  it('shows one page when at or below the page size', () => {
    expect(seatingChartPageCount(0)).toBe(1)
    expect(seatingChartPageCount(SEATING_CHART_PAGE_TABLES)).toBe(1)
  })

  it('pages larger venues', () => {
    expect(seatingChartPageCount(6)).toBe(2)
    expect(seatingChartPageCount(20)).toBe(4)
  })
})

describe('seatingChartPageTables', () => {
  const tables = Array.from({ length: 20 }, (_, i) => i + 1)

  it('slices tables for each page', () => {
    expect(seatingChartPageTables(tables, 0)).toEqual([1, 2, 3, 4, 5])
    expect(seatingChartPageTables(tables, 1)).toEqual([6, 7, 8, 9, 10])
    expect(seatingChartPageTables(tables, 3)).toEqual([16, 17, 18, 19, 20])
  })

  it('wraps page index', () => {
    expect(seatingChartPageTables(tables, 4)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('seatingChartWFormationLayout', () => {
  it('places five tables in a W (3 top, 2 staggered bottom)', () => {
    const layout = seatingChartWFormationLayout(5)
    expect(layout.rowCount).toBe(2)
    expect(layout.trackColumns).toBe(6)
    expect(layout.slots).toEqual([
      { gridColumn: '1 / 3', gridRow: 1 },
      { gridColumn: '3 / 5', gridRow: 1 },
      { gridColumn: '5 / 7', gridRow: 1 },
      { gridColumn: '2 / 4', gridRow: 2 },
      { gridColumn: '4 / 6', gridRow: 2 },
    ])
  })

  it('shrink-wraps partial pages', () => {
    expect(seatingChartWFormationLayout(3).rowCount).toBe(1)
    expect(seatingChartWFormationLayout(4).slots[3]).toEqual({
      gridColumn: '3 / 5',
      gridRow: 2,
    })
  })
})

describe('seatingChartPageLabel', () => {
  it('describes the visible table range', () => {
    expect(seatingChartPageLabel(0, 20)).toEqual({
      page: 1,
      pageCount: 4,
      tableRange: '1–5',
    })
    expect(seatingChartPageLabel(3, 20)).toEqual({
      page: 4,
      pageCount: 4,
      tableRange: '16–20',
    })
  })
})
