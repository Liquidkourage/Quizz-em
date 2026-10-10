import { describe, expect, it } from 'vitest'
import { resolvePreAction, type PreAction } from './preAction'
import type { BettingContext } from './bettingModel'

function ctx(partial: Partial<BettingContext>): BettingContext {
  return {
    isBettingPhase: true,
    isBettingOpen: true,
    isMyTurn: true,
    myContribution: 0,
    currentBet: 20,
    toCall: 20,
    minRaise: 20,
    isOpeningBet: false,
    canBet: true,
    canCheck: false,
    canCall: true,
    canRaise: true,
    canAllIn: true,
    canFold: true,
    ...partial,
  }
}

describe('resolvePreAction', () => {
  it('check/fold checks when free and folds facing a bet', () => {
    const pre: PreAction = { kind: 'checkFold' }
    expect(resolvePreAction(pre, ctx({ toCall: 0, currentBet: 0 }))).toBe('check')
    expect(resolvePreAction(pre, ctx({ toCall: 20, currentBet: 20 }))).toBe('fold')
  })

  it('call any checks or calls', () => {
    const pre: PreAction = { kind: 'callAny' }
    expect(resolvePreAction(pre, ctx({ toCall: 0 }))).toBe('check')
    expect(resolvePreAction(pre, ctx({ toCall: 60, currentBet: 60 }))).toBe('call')
  })

  it('call/fold folds when the bet is raised past the lock', () => {
    const pre: PreAction = { kind: 'callFold', maxBet: 20 }
    expect(resolvePreAction(pre, ctx({ toCall: 20, currentBet: 20 }))).toBe('call')
    expect(resolvePreAction(pre, ctx({ toCall: 60, currentBet: 60 }))).toBe('fold')
    expect(resolvePreAction(pre, ctx({ toCall: 0, currentBet: 0 }))).toBe('check')
  })
})
