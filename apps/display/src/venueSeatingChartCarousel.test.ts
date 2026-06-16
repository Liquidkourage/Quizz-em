import { describe, expect, it } from 'vitest'
import {
  SEATING_CHART_PAGE_TABLES,
  seatingChartPageCount,
  seatingChartPageLabel,
  seatingChartPageTables,
  seatingChartWFormationRows,
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

describe('seatingChartWFormationRows', () => {
  it('places five tables in top + staggered bottom rows', () => {
    expect(seatingChartWFormationRows(5)).toEqual({
      topIndices: [0, 1, 2],
      bottomIndices: [3, 4],
    })
  })

  it('shrink-wraps partial pages', () => {
    expect(seatingChartWFormationRows(3)).toEqual({
      topIndices: [0, 1, 2],
      bottomIndices: [],
    })
    expect(seatingChartWFormationRows(4)).toEqual({
      topIndices: [0, 1, 2],
      bottomIndices: [3],
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
