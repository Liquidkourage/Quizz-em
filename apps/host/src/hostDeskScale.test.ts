import { describe, expect, it } from 'vitest'
import { hostDeskFrameStyle } from './hostDeskScale'

describe('host desk scale', () => {
  it('shrinks the whole desk a little and still fills the screen', () => {
    const style = hostDeskFrameStyle()
    expect(style.zoom).toBeLessThan(1)
    expect(style.zoom).toBeGreaterThanOrEqual(0.85)
    expect(style.height).toBe(`calc(100dvh / ${style.zoom})`)
    expect(style.maxHeight).toBe(style.height)
  })
})
