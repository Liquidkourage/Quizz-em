import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import { HostNudgeClock, HostShowClocks, formatElapsedClock, soonestNudgeSeconds } from './HostShowClocks'

function felt(over: Partial<HostVenueFeltBeatRow>): HostVenueFeltBeatRow {
  return {
    tableNum: 1,
    active: true,
    seated: 2,
    phase: 'betting',
    street: 'Pre-board',
    clock: 'Clock open',
    answerDeadlineMs: null,
    phaseStrictSig: 'bet',
    ...over,
  }
}

describe('host show clocks', () => {
  it('formats a running hand and a running event', () => {
    expect(formatElapsedClock(1_000, 13_000)).toBe('0:12')
    expect(formatElapsedClock(1_000, 91_000)).toBe('1:30')
    expect(formatElapsedClock(1_000, 1_000 + 3_661_000)).toBe('1:01:01')
    expect(formatElapsedClock(null, 50_000)).toBe('—')
  })

  it('keeps the hand clock and the event clock together', () => {
    const now = 1_000_000
    const html = renderToStaticMarkup(
      createElement(HostShowClocks, {
        showStartedAtMs: now - 90_000,
        handStartedAtMs: now - 12_000,
        nowMs: now,
      }),
    )
    expect(html).toContain('Event')
    expect(html).toContain('Hand')
    expect(html).toContain('1:30')
    expect(html).toContain('0:12')
  })

  it('shows the 30s nudge that is running on a felt', () => {
    const now = 1_000_000
    const rows = [felt({ turnDeadlineMs: now + 30_000 })]
    expect(soonestNudgeSeconds(rows, now)).toBe(30)
    const html = renderToStaticMarkup(createElement(HostNudgeClock, { rows, nowMs: now }))
    expect(html).toContain('Nudge')
    expect(html).toContain('30')
  })
})
