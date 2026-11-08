import { describe, expect, it } from 'vitest'
import {
  ANSWER_REVEAL_BEFORE_WINNERS_MS,
  winnerScreensPayoutHint,
  winnerScreensReadyAt,
} from './winnerScreens'

describe('winner screens before payout', () => {
  it('waits out the answer card once, however many tables are showing winners', () => {
    expect(ANSWER_REVEAL_BEFORE_WINNERS_MS).toBe(5_000)
    const started = 1_000_000
    const ready = winnerScreensReadyAt(started, 2)
    expect(ready).toBe(started + ANSWER_REVEAL_BEFORE_WINNERS_MS)
    expect(winnerScreensReadyAt(started, 8)).toBe(ready)
    expect(winnerScreensPayoutHint(ready, started)).toContain('The answer is still on the screens')
    expect(winnerScreensPayoutHint(ready, ready - 1)).toContain('1s')
    expect(winnerScreensPayoutHint(ready, ready)).toBeNull()
  })

  it('does not hold payout when no table is showing winners', () => {
    expect(winnerScreensReadyAt(5_000, 0)).toBe(5_000)
    expect(winnerScreensPayoutHint(null, 5_000)).toBeNull()
  })
})
