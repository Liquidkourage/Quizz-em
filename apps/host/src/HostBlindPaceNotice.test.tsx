import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HostBlindPaceNotice, { showBlindPaceNotice } from './HostBlindPaceNotice'

describe('showBlindPaceNotice', () => {
  it('stays up only while the answer is still on the public screens', () => {
    expect(showBlindPaceNotice(10_000, 9_000, null)).toBe(true)
    expect(showBlindPaceNotice(10_000, 10_000, null)).toBe(false)
    expect(showBlindPaceNotice(10_000, 9_000, 10_000)).toBe(false)
    expect(showBlindPaceNotice(null, 9_000, null)).toBe(false)
  })
})

describe('HostBlindPaceNotice', () => {
  it('tells the host the pace suggestion while the answer is up', () => {
    const html = renderToStaticMarkup(
      createElement(HostBlindPaceNotice, {
        open: true,
        showStartedAtMs: null,
        handsLeft: 15,
        players: 40,
        medianStack: 1000,
        smallBlind: 10,
        bigBlind: 20,
        nowMs: 1_000,
        onApply: () => {},
        onClose: () => {},
      }),
    )
    expect(html).toContain('Blind pace')
    expect(html).toContain('While the answer is up')
    expect(html).toContain('Now')
    expect(html).toContain('Next level, closest')
    expect(html).not.toContain('Slow down')
    expect(html).toContain('120 min')
    expect(html).not.toContain('guessing guide')
    expect(html).not.toContain('level every')
    expect(html).toContain('Apply')
  })

  it('stays quiet once the answer beat is over', () => {
    const html = renderToStaticMarkup(
      createElement(HostBlindPaceNotice, {
        open: false,
        showStartedAtMs: null,
        handsLeft: 15,
        players: 40,
        medianStack: 1000,
        smallBlind: 10,
        bigBlind: 20,
        nowMs: 1_000,
        onApply: () => {},
        onClose: () => {},
      }),
    )
    expect(html).toBe('')
  })
})
