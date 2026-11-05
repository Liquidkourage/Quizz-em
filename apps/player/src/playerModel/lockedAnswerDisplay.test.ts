import { describe, expect, it } from 'vitest'
import { lockedAnswerDisplayText, optimisticGuessStillShown } from './lockedAnswerDisplay'

describe('lockedAnswerDisplayText', () => {
  it('restores the server guess after a reload', () => {
    expect(lockedAnswerDisplayText({ editing: false, serverAnswer: 1440, optimistic: null })).toBe('1,440')
  })

  it('keeps an optimistic lock until the server echoes it', () => {
    expect(lockedAnswerDisplayText({ editing: false, serverAnswer: undefined, optimistic: '92,459' })).toBe('92,459')
  })

  it('drops a local submitted label once a newer table state has no guess', () => {
    expect(
      optimisticGuessStillShown({
        optimistic: '92,459',
        serverAnswer: undefined,
        stateEpoch: 4,
        optimisticEpoch: 3,
      }),
    ).toBe(false)
  })

  it('keeps a local submitted label until the next table state arrives', () => {
    expect(
      optimisticGuessStillShown({
        optimistic: '92,459',
        serverAnswer: undefined,
        stateEpoch: 3,
        optimisticEpoch: 3,
      }),
    ).toBe(true)
  })

  it('unlocks the keypad while the player is editing', () => {
    expect(lockedAnswerDisplayText({ editing: true, serverAnswer: 1440, optimistic: null })).toBeNull()
  })
})