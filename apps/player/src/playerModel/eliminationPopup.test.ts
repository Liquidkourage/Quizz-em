import { describe, expect, it } from 'vitest'
import { ELIMINATION_POPUP_MS, eliminationPopupHandKey, type EliminationWatch } from './eliminationPopup'

const inChips: EliminationWatch = { pointsOnly: false, roundId: 'hand-4' }

describe('eliminationPopupHandKey', () => {
  it('stays quiet on the first snapshot so a reconnect does not replay the bust', () => {
    expect(
      eliminationPopupHandKey(null, { pointsOnly: true, phase: 'lobby', roundId: 'hand-5' }),
    ).toBeNull()
  })

  it('opens after payout when this seat first becomes points-only', () => {
    expect(
      eliminationPopupHandKey(inChips, { pointsOnly: true, phase: 'lobby', roundId: 'hand-5' }),
    ).toBe('hand-5')
  })

  it('opens on the payout phase the same way', () => {
    expect(
      eliminationPopupHandKey(inChips, { pointsOnly: true, phase: 'payout', roundId: 'hand-5' }),
    ).toBe('hand-5')
  })

  it('stays down while the seat still has chips', () => {
    expect(
      eliminationPopupHandKey(inChips, { pointsOnly: false, phase: 'lobby', roundId: 'hand-5' }),
    ).toBeNull()
  })

  it('does not open mid-hand', () => {
    expect(
      eliminationPopupHandKey(inChips, { pointsOnly: true, phase: 'showdown', roundId: 'hand-4' }),
    ).toBeNull()
  })

  it('does not open again on the next hand', () => {
    const alreadyOut: EliminationWatch = { pointsOnly: true, roundId: 'hand-5' }
    expect(
      eliminationPopupHandKey(alreadyOut, { pointsOnly: true, phase: 'lobby', roundId: 'hand-6' }),
    ).toBeNull()
  })
})

describe('ELIMINATION_POPUP_MS', () => {
  it('holds long enough to read, matching the one-player TV bust dwell', () => {
    expect(ELIMINATION_POPUP_MS).toBe(6500)
  })
})
