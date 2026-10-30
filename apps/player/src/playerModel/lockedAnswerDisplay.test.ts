import { describe, expect, it } from 'vitest'
import { lockedAnswerDisplayText } from './lockedAnswerDisplay'

describe('lockedAnswerDisplayText', () => {
  it('restores the server guess after a reload', () => {
    expect(lockedAnswerDisplayText({ editing: false, serverAnswer: 1440, optimistic: null })).toBe('1,440')
  })

  it('keeps an optimistic lock until the server echoes it', () => {
    expect(lockedAnswerDisplayText({ editing: false, serverAnswer: undefined, optimistic: '92,459' })).toBe('92,459')
  })

  it('unlocks the keypad while the player is editing', () => {
    expect(lockedAnswerDisplayText({ editing: true, serverAnswer: 1440, optimistic: null })).toBeNull()
  })
})