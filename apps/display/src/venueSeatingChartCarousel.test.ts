import { describe, expect, it } from 'vitest'
import {
  SEATING_CHART_PAGE_TABLES,
  SEATING_CHART_PAGE_TABLES_NARROW,
  seatingChartPageCount,
  seatingChartPageLabel,
  seatingChartPageSizeForViewport,
  seatingChartPageTables,
} from './venueSeatingChartCarousel'

describe('seatingChartPageSizeForViewport', () => {
  it('shows three placards on wide displays', () => {
    expect(seatingChartPageSizeForViewport(1920)).toBe(SEATING_CHART_PAGE_TABLES)
  })

  it('shows two placards on narrow displays', () => {
    expect(seatingChartPageSizeForViewport(1366)).toBe(SEATING_CHART_PAGE_TABLES_NARROW)
  })
})

describe('seatingChartPageCount', () => {
  it('shows one page when at or below the page size', () => {
    expect(seatingChartPageCount(0)).toBe(1)
    expect(seatingChartPageCount(SEATING_CHART_PAGE_TABLES)).toBe(1)
  })

  it('pages larger venues in groups of three', () => {
    expect(seatingChartPageCount(6)).toBe(2)
    expect(seatingChartPageCount(14)).toBe(5)
    expect(seatingChartPageCount(20)).toBe(7)
  })

  it('pages in groups of two when configured', () => {
    expect(seatingChartPageCount(14, SEATING_CHART_PAGE_TABLES_NARROW)).toBe(7)
  })
})

describe('seatingChartPageTables', () => {
  const tables = Array.from({ length: 14 }, (_, i) => i + 1)

  it('slices tables three per page', () => {
    expect(seatingChartPageTables(tables, 0)).toEqual([1, 2, 3])
    expect(seatingChartPageTables(tables, 1)).toEqual([4, 5, 6])
    expect(seatingChartPageTables(tables, 4)).toEqual([13, 14])
  })

  it('wraps page index', () => {
    expect(seatingChartPageTables(tables, 5)).toEqual([1, 2, 3])
  })

  it('slices two per page when configured', () => {
    expect(seatingChartPageTables(tables, 0, SEATING_CHART_PAGE_TABLES_NARROW)).toEqual([1, 2])
    expect(seatingChartPageTables(tables, 6, SEATING_CHART_PAGE_TABLES_NARROW)).toEqual([13, 14])
  })
})

describe('seatingChartPageLabel', () => {
  it('describes the visible table range', () => {
    expect(seatingChartPageLabel(0, 14)).toEqual({
      page: 1,
      pageCount: 5,
      tableRange: '1–3',
    })
    expect(seatingChartPageLabel(4, 14)).toEqual({
      page: 5,
      pageCount: 5,
      tableRange: '13–14',
    })
  })
})
