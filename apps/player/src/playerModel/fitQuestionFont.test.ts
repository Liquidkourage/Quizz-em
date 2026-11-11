import { describe, expect, it } from 'vitest'
import { largestFittingFontPx, stickyQuestionMaxPx } from './fitQuestionFont'

describe('largestFittingFontPx', () => {
  it('shrinks a long question until every line fits the box', () => {
    const fitted = largestFittingFontPx(
      (fontPx) => ({ height: fontPx * 6, width: fontPx * 3 }),
      100,
      200,
      40,
      12,
    )
    expect(fitted * 6).toBeLessThanOrEqual(101)
    expect(fitted).toBeGreaterThan(15)
    expect(fitted).toBeLessThan(18)
  })

  it('does not grow a short question past the layout size', () => {
    expect(stickyQuestionMaxPx(17.6)).toBe(17.6)
    expect(stickyQuestionMaxPx(0)).toBe(13)
  })

  it('keeps a short question at the largest size that still fits', () => {
    const fitted = largestFittingFontPx(
      () => ({ height: 20, width: 40 }),
      200,
      200,
      32,
      12,
    )
    expect(fitted).toBeGreaterThan(31)
  })
})
