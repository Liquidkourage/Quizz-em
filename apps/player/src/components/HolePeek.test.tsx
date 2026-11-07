import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HolePeek, HolePeekFaces } from './HolePeek'

describe('hole peek', () => {
  it('hides both cards until the player is holding the peek', () => {
    const idle = renderToStaticMarkup(createElement(HolePeek, { digits: [0, 4] }))
    expect(idle).toContain('Hold to peek')
    expect(idle).not.toContain('digit-0')
    expect(idle).not.toContain('digit-4')
    expect(idle).not.toContain('Card 0')
    expect(idle).not.toContain('Card 4')

    const held = renderToStaticMarkup(createElement(HolePeekFaces, { digits: [0, 4], held: true }))
    expect(held).toContain('Card 0')
    expect(held).toContain('Card 4')
  })
})
