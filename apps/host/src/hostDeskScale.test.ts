import { describe, expect, it } from 'vitest'
import { hostDeskFrameStyle } from './hostDeskScale'

describe('host desk scale', () => {
  it('shrinks the whole desk a little and still fills the screen', () => {
    const style = hostDeskFrameStyle()
    expect(style.zoom).toBe(0.8)
    expect(style.height).toBe(`calc(100dvh / ${style.zoom})`)
    expect(style.maxHeight).toBe(style.height)
  })
})
