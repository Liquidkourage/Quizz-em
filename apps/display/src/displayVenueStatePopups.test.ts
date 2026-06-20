import { describe, expect, it } from 'vitest'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import {
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
