import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueBlindChange, { blindChangeFromPayload, questionYieldsToBlinds } from './VenueBlindChange'

describe('VenueBlindChange', () => {
  it('reads a blind change off the wall snapshot', () => {
    expect(blindChangeFromPayload({ smallBlind: 15, bigBlind: 30, atMs: 5 })).toEqual({
      smallBlind: 15,
      bigBlind: 30,
      atMs: 5,
    })
    expect(blindChangeFromPayload(null)).toBeNull()
    expect(blindChangeFromPayload({ smallBlind: 0, bigBlind: 30, atMs: 5 })).toBeNull()
    expect(
      blindChangeFromPayload({
        smallBlind: 20,
        bigBlind: 40,
        previousSmallBlind: 10,
        previousBigBlind: 20,
        atMs: 9,
      }),
    ).toEqual({
      smallBlind: 20,
      bigBlind: 40,
      previousSmallBlind: 10,
      previousBigBlind: 20,
      atMs: 9,
    })
  })

  it('shows the new blinds', () => {
    const html = renderToStaticMarkup(
      createElement(VenueBlindChange, { notice: { smallBlind: 15, bigBlind: 30, atMs: 5 } }),
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Blinds')
    expect(html).toContain('aria-label="$15 / $30"')
    expect(html).not.toContain('bg-black/55')
    expect(html).toContain('bg-[#050806]')
  })

  it('shows the blinds the room just left beside the new blinds', () => {
    const html = renderToStaticMarkup(
      createElement(VenueBlindChange, {
        notice: {
          smallBlind: 20,
          bigBlind: 40,
          previousSmallBlind: 10,
          previousBigBlind: 20,
          atMs: 9,
        },
      }),
    )
    expect(html).toContain('Were')
    expect(html).toContain('Now')
    expect(html).toContain('aria-label="$10 / $20"')
    expect(html).toContain('aria-label="$20 / $40"')
    expect(html).toContain('blind-change-were')
    expect(html).toContain('blind-change-now')
    expect(html).toContain('blind-reel')
    expect(html).toContain('blind-beam')
  })

  it('keeps the question off the screen until the blinds announcement is finished', () => {
    expect(questionYieldsToBlinds(true, 5, null)).toBe(true)
    expect(questionYieldsToBlinds(true, 5, 5)).toBe(false)
    expect(questionYieldsToBlinds(false, 5, null)).toBe(false)
  })
})
