import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
  collapseRedundantVenuePopups,
  detectDisplayVenueStatePopups,
  snapshotDisplayVenueBeat,
} from './displayVenueStatePopups'

function tile(overrides: Partial<DisplayVenueTileSnapshot> & { tableNum: number }): DisplayVenueTileSnapshot {
  return {
    seated: 4,
    pot: 100,
    phase: 'betting',
    seatNames: ['A', 'B', 'C', 'D'],
    seatBankrolls: [1000, 1000, 1000, 1000],
    ...overrides,
  }
}

describe('detectDisplayVenueStatePopups', () => {
  it('does not announce answer window when one table is answering early', () => {
    const prev = snapshotDisplayVenueBeat(null, [
      tile({ tableNum: 1, phase: 'betting', bettingRound: 2, isBettingOpen: true }),
      tile({ tableNum: 2, phase: 'betting', bettingRound: 2, isBettingOpen: true }),
    ])
    const next = snapshotDisplayVenueBeat(null, [
      tile({ tableNum: 1, phase: 'answering' }),
      tile({ tableNum: 2, phase: 'betting', bettingRound: 2, isBettingOpen: true }),
    ])
    const popups = detectDisplayVenueStatePopups(prev, next)
    expect(popups.some((p) => p.kind === 'answer-window-start')).toBe(false)
  })

  it('announces answer window when venue countdown arms', () => {
    const prev = snapshotDisplayVenueBeat(
      { answerDeadlineMs: null } as never,
      [
        tile({ tableNum: 1, phase: 'betting', bettingRound: 2, isBettingOpen: false }),
        tile({ tableNum: 2, phase: 'betting', bettingRound: 2, isBettingOpen: false }),
      ],
    )
    const next = snapshotDisplayVenueBeat(
      { answerDeadlineMs: Date.now() + 45_000 } as never,
      [
        tile({ tableNum: 1, phase: 'answering' }),
        tile({ tableNum: 2, phase: 'answering' }),
      ],
    )
    const popups = detectDisplayVenueStatePopups(prev, next)
    expect(popups.some((p) => p.kind === 'answer-window-start')).toBe(true)
  })

  it('shows only board dealt when R1 closes then board appears on next beat', () => {
    const prev = snapshotDisplayVenueBeat(null, [
      tile({ tableNum: 1, phase: 'betting', bettingRound: 1, isBettingOpen: true }),
      tile({ tableNum: 2, phase: 'betting', bettingRound: 1, isBettingOpen: true }),
    ])
    const mid = snapshotDisplayVenueBeat(null, [
      tile({ tableNum: 1, phase: 'betting', bettingRound: 1, isBettingOpen: false }),
      tile({ tableNum: 2, phase: 'betting', bettingRound: 1, isBettingOpen: false }),
    ])
    const next = snapshotDisplayVenueBeat(null, [
      tile({
        tableNum: 1,
        phase: 'betting',
        bettingRound: 2,
        isBettingOpen: true,
        communityDigits: [1, 2, 3, 4, 5],
      }),
      tile({
        tableNum: 2,
        phase: 'betting',
        bettingRound: 2,
        isBettingOpen: true,
        communityDigits: [1, 2, 3, 4, 5],
      }),
    ])
    expect(detectDisplayVenueStatePopups(prev, mid)).toEqual([])
    expect(detectDisplayVenueStatePopups(mid, next).map((p) => p.kind)).toEqual(['board-dealt'])
  })

  it('shows only answer window when R2 closes and countdown arms together', () => {
    const prev = snapshotDisplayVenueBeat(
      { answerDeadlineMs: null } as never,
      [
        tile({ tableNum: 1, phase: 'betting', bettingRound: 2, isBettingOpen: true }),
        tile({ tableNum: 2, phase: 'betting', bettingRound: 2, isBettingOpen: true }),
      ],
    )
    const next = snapshotDisplayVenueBeat(
      { answerDeadlineMs: Date.now() + 45_000 } as never,
      [
        tile({ tableNum: 1, phase: 'answering' }),
        tile({ tableNum: 2, phase: 'answering' }),
      ],
    )
    expect(detectDisplayVenueStatePopups(prev, next).map((p) => p.kind)).toEqual(['answer-window-start'])
  })

  it('drops queued lead-in popups when the follow-up beat arrives', () => {
    expect(
      collapseRedundantVenuePopups([
        { kind: 'round1-complete', title: 'Pre-board wagering closed' },
        { kind: 'board-dealt', title: 'Board is out' },
      ]).map((p) => p.kind),
    ).toEqual(['board-dealt'])
    expect(
      collapseRedundantVenuePopups([
        { kind: 'round2-complete', title: 'Post-board wagering closed' },
        { kind: 'answer-window-start', title: 'Answer on your phone' },
      ]).map((p) => p.kind),
    ).toEqual(['answer-window-start'])
  })

  it('announces board dealt when community cards appear', () => {
    const prev = snapshotDisplayVenueBeat(null, [
      tile({ tableNum: 1, phase: 'betting', bettingRound: 1, isBettingOpen: false }),
    ])
    const next = snapshotDisplayVenueBeat(null, [
      tile({
        tableNum: 1,
        phase: 'betting',
        bettingRound: 2,
        isBettingOpen: true,
        communityDigits: [1, 2, 3, 4, 5],
      }),
    ])
    const popups = detectDisplayVenueStatePopups(prev, next)
    expect(popups.some((p) => p.kind === 'board-dealt')).toBe(true)
  })
})
