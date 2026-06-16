import { describe, expect, it } from 'vitest'
import {
  SEATING_CHART_PAGE_TABLES,
  seatingChartPageCount,
  seatingChartPageGrid,
  seatingChartPageLabel,
  seatingChartPageTables,
} from './venueSeatingChartCarousel'

describe('seatingChartPageCount', () => {
  it('shows one page when at or below the page size', () => {
    expect(seatingChartPageCount(0)).toBe(1)
    expect(seatingChartPageCount(SEATING_CHART_PAGE_TABLES)).toBe(1)
  })

  it('pages larger venues', () => {
    expect(seatingChartPageCount(5)).toBe(2)
    expect(seatingChartPageCount(20)).toBe(5)
  })
})

describe('seatingChartPageTables', () => {
  const tables = Array.from({ length: 20 }, (_, i) => i + 1)

  it('slices tables for each page', () => {
    expect(seatingChartPageTables(tables, 0)).toEqual([1, 2, 3, 4])
    expect(seatingChartPageTables(tables, 1)).toEqual([5, 6, 7, 8])
    expect(seatingChartPageTables(tables, 4)).toEqual([17, 18, 19, 20])
  })

  it('wraps page index', () => {
    expect(seatingChartPageTables(tables, 5)).toEqual([1, 2, 3, 4])
  })
})

describe('seatingChartPageGrid', () => {
  it('uses a 2×2 grid for full pages', () => {
    expect(seatingChartPageGrid(4)).toEqual({ columns: 2, rowCount: 2 })
  })

  it('shrink-wraps partial pages', () => {
    expect(seatingChartPageGrid(2)).toEqual({ columns: 2, rowCount: 1 })
    expect(seatingChartPageGrid(3)).toEqual({ columns: 2, rowCount: 2 })
  })
})

describe('seatingChartPageLabel', () => {
  it('describes the visible table range', () => {
    expect(seatingChartPageLabel(0, 20)).toEqual({
      page: 1,
      pageCount: 5,
      tableRange: '1–4',
    })
    expect(seatingChartPageLabel(4, 20)).toEqual({
      page: 5,
      pageCount: 5,
      tableRange: '17–20',
    })
  })
})
