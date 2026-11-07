import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueBlindChange, { blindChangeFromPayload } from './VenueBlindChange'

describe('VenueBlindChange', () => {
  it('reads a blind change off the wall snapshot', () => {
    expect(blindChangeFromPayload({ smallBlind: 15, bigBlind: 30, atMs: 5 })).toEqual({
      smallBlind: 15,
      bigBlind: 30,
      atMs: 5,
    })
    expect(blindChangeFromPayload(null)).toBeNull()
    expect(blindChangeFromPayload({ smallBlind: 0, bigBlind: 30, atMs: 5 })).toBeNull()
  })

  it('shows the new blinds', () => {
    const html = renderToStaticMarkup(
      createElement(VenueBlindChange, { notice: { smallBlind: 15, bigBlind: 30, atMs: 5 } }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Blinds')
    expect(html).toContain('aria-label="$15 / $30"')
  })
})
