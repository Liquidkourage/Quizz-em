import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueBustAnnouncement from './VenueBustAnnouncement'

describe('elimination card', () => {
  it('fills the TV instead of staying a small centered card', () => {
    const html = renderToStaticMarkup(
      createElement(VenueBustAnnouncement, {
        busts: [{ name: 'Ada Lane', tableNum: 2 }],
      }),
    )
    expect(html).toContain('venue-seating-update')
    expect(html).toContain('max-width:none')
    expect(html).not.toContain('52rem')
  })
})
