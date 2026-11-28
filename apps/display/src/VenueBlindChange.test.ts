import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VenueBlindChange, {
  blindChangeFromPayload,
  blindRise,
  climbedBlind,
  questionYieldsToBlinds,
} from './VenueBlindChange'

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

  it('counts one pair up from the blinds the room just left', () => {
    expect(climbedBlind(10, 20, 0)).toBe(10)
    expect(climbedBlind(10, 20, 1)).toBe(20)
    expect(climbedBlind(10, 20, 0.5)).toBeGreaterThan(15)
    expect(climbedBlind(10, 20, 0.5)).toBeLessThan(20)
    expect(climbedBlind(40, 20, 1)).toBe(20)

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
    expect(html).toContain('Blinds')
    expect(html).not.toContain('Were')
    expect(html).not.toContain('Now')
    expect(html).not.toContain('In play')
    expect(html).toContain('>$10<')
    expect(html).toContain('>$20<')
    expect(html).toContain('blind-rise-amount')
    expect(html).not.toContain('>$10 / $20<')
    expect(html).toContain('aria-label="$20 / $40"')
    expect(blindRise(10, 40)).toBe(0.25)
    expect(blindRise(20, 40)).toBe(0.5)
    expect(blindRise(40, 40)).toBe(1)
    expect(html).toContain('blind-rise-small')
    expect(html).toContain('blind-rise-big')
    expect(html).toContain('--rise:0.25')
    expect(html).toContain('--rise:0.5')
    expect(html).not.toContain('blind-reel')
    expect(html).not.toContain('blind-beam')
    expect(html).not.toContain('chip')
  })

  it('keeps the question off the screen until the blinds announcement is finished', () => {
    expect(questionYieldsToBlinds(true, 5, null)).toBe(true)
    expect(questionYieldsToBlinds(true, 5, 5)).toBe(false)
    expect(questionYieldsToBlinds(false, 5, null)).toBe(false)
  })
})
