import { describe, expect, it } from 'vitest'
import {
  ANSWER_REVEAL_BEFORE_WINNERS_MS,
  WINNER_SCREEN_DWELL_MS,
  winnerScreensPayoutHint,
  winnerScreensReadyAt,
} from './winnerScreens'

describe('winner screens before payout', () => {
  it('waits out the answer card and one pass of every table', () => {
    const started = 1_000_000
    const ready = winnerScreensReadyAt(started, 2)
    expect(ready).toBe(started + ANSWER_REVEAL_BEFORE_WINNERS_MS + 2 * WINNER_SCREEN_DWELL_MS)
    expect(winnerScreensPayoutHint(ready, started)).toContain('Winners are still on the screens')
    expect(winnerScreensPayoutHint(ready, ready - 1)).toContain('1s')
    expect(winnerScreensPayoutHint(ready, ready)).toBeNull()
  })

  it('does not hold payout when no table is showing winners', () => {
    expect(winnerScreensReadyAt(5_000, 0)).toBe(5_000)
    expect(winnerScreensPayoutHint(null, 5_000)).toBeNull()
  })
})
