import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import {
  HostNudgeClock,
  HostShowClocks,
  formatElapsedClock,
  lastActionAtMs,
  nudgeSlowPlayersLabel,
  slowActionPlayerCount,
  soonestNudgeSeconds,
  tableActionClockStart,
} from './HostShowClocks'

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

  it('keeps an hour-long event clock inside the face', () => {
    const now = 1_000_000
    const html = renderToStaticMarkup(
      createElement(HostShowClocks, {
        showStartedAtMs: now - (3600 + 3 * 60 + 2) * 1000,
        handStartedAtMs: now - 12_000,
        nowMs: now,
      }),
    )
    expect(html).toContain('1:03:02')
    expect(html).toContain('min-w-[8.5rem]')
    expect(html).toContain('text-2xl')
  })

  it('keeps the hand clock and the event clock together', () => {
    const now = 1_000_000
    const html = renderToStaticMarkup(
      createElement(HostShowClocks, {
        showStartedAtMs: now - 90_000,
        handStartedAtMs: now - 12_000,
        phaseStartedAtMs: now - 240_000,
        nowMs: now,
      }),
    )
    expect(html).toContain('Event')
    expect(html).toContain('Hand')
    expect(html).toContain('Phase')
    expect(html).toContain('1:30')
    expect(html).toContain('0:12')
    expect(html).toContain('4:00')
  })

  it('hides the phase clock outside a betting phase', () => {
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
    expect(html).not.toContain('Phase')
  })

  it('counts from the latest action this hand, or from the hand start', () => {
    const hand = 1_000_000
    const moves = [
      { tableNum: 1, atMs: hand + 4_000 },
      { tableNum: 1, atMs: hand + 12_000 },
      { tableNum: 2, atMs: hand - 5_000 },
    ]
    expect(lastActionAtMs(moves, 1, hand)).toBe(hand + 12_000)
    expect(lastActionAtMs(moves, 2, hand)).toBe(hand)
    expect(lastActionAtMs(moves, 1, null)).toBe(hand + 12_000)
    expect(lastActionAtMs(moves, 2, null)).toBe(hand - 5_000)
  })

  it('restarts when the listed player changes, and ignores an older table move', () => {
    const hand = 1_000_000
    const moves = [{ tableNum: 1, atMs: hand + 4_000 }]
    expect(tableActionClockStart(hand + 20_000, moves, 1, hand)).toBe(hand + 20_000)
    expect(tableActionClockStart(hand - 5_000, moves, 1, hand)).toBe(hand + 4_000)
    expect(tableActionClockStart(null, moves, 1, hand)).toBe(hand + 4_000)
  })

  it('counts players who have been on the action for 15 seconds', () => {
    const now = 30_000
    const rows = [
      { tableNum: 1, phase: 'betting', actingPlayerName: 'Ada', actingSinceMs: now - 15_000 },
      { tableNum: 2, phase: 'betting', actingPlayerName: 'Bo', actingSinceMs: now - 14_999 },
      { tableNum: 3, phase: 'betting', betsClosed: true, actingPlayerName: 'Cy', actingSinceMs: now - 40_000 },
      { tableNum: 4, phase: 'answering', actingPlayerName: 'Dee', actingSinceMs: now - 40_000 },
    ]
    expect(slowActionPlayerCount(rows, [], null, now)).toBe(1)
    expect(nudgeSlowPlayersLabel(0)).toBe('Nudge slow players (0)')
    expect(nudgeSlowPlayersLabel(1)).toBe('Nudge slow players (1)')
  })

  it('shows the 30s nudge that is running on a felt', () => {
    const now = 1_000_000
    const rows = [felt({ turnDeadlineMs: now + 30_000 })]
    expect(soonestNudgeSeconds(rows, now)).toBe(30)
    const html = renderToStaticMarkup(createElement(HostNudgeClock, { rows, nowMs: now }))
    expect(html).toContain('Last call for responses')
    expect(html).toContain('30')
  })
})
