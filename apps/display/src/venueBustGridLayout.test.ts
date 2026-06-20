import { describe, expect, it } from 'vitest'
import { computeVenueBustGridLayout } from './venueBustGridLayout'

describe('computeVenueBustGridLayout', () => {
  it('uses at least two columns for several busts', () => {
    const layout = computeVenueBustGridLayout(8, 1280, 720)
    expect(layout.columns).toBeGreaterThanOrEqual(2)
  })

  it('expands columns for large lists so rows fit without scrolling', () => {
    const layout = computeVenueBustGridLayout(26, 1920, 1080)
    expect(layout.columns).toBeGreaterThanOrEqual(3)
    const rows = Math.ceil(26 / layout.columns)
    expect(rows).toBeLessThanOrEqual(9)
  })
})
