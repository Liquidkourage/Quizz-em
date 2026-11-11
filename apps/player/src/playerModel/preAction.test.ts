import { describe, expect, it } from 'vitest'
import { autoActionShouldFire, autoCallLimitFromInput, preActionAlert, resolveAutoAction } from './preAction'

describe('resolveAutoAction', () => {
  it('checks when nothing is owed, whatever the limit', () => {
    expect(resolveAutoAction(0, 0)).toBe('check')
    expect(resolveAutoAction(40, 0)).toBe('check')
  })

  it('calls when the amount owed is under or exactly the limit', () => {
    expect(resolveAutoAction(40, 20)).toBe('call')
    expect(resolveAutoAction(20, 20)).toBe('call')
  })

  it('folds when the amount owed is over the limit', () => {
    expect(resolveAutoAction(20, 21)).toBe('fold')
    expect(resolveAutoAction(0, 5)).toBe('fold')
  })

  it('names the chips actually called when the stack is short', () => {
    expect(preActionAlert('check', 0, 1000)).toBe('Checked')
    expect(preActionAlert('fold', 60, 1000)).toBe('Folded')
    expect(preActionAlert('call', 60, 1000)).toBe('Called $60')
    expect(preActionAlert('call', 60, 40)).toBe('Called $40')
  })

  it('treats a blank amount as off and keeps zero as a real limit', () => {
    expect(autoCallLimitFromInput('')).toBeNull()
    expect(autoCallLimitFromInput('   ')).toBeNull()
    expect(autoCallLimitFromInput('0')).toBe(0)
    expect(autoCallLimitFromInput('40')).toBe(40)
    expect(autoCallLimitFromInput('4a')).toBeNull()
  })

  it('lets a manual action for this turn win', () => {
    expect(autoActionShouldFire(20, true, 'hand:1:2', '')).toBe(true)
    expect(autoActionShouldFire(20, true, 'hand:1:2', 'hand:1:2')).toBe(false)
    expect(autoActionShouldFire(null, true, 'hand:1:2', '')).toBe(false)
    expect(autoActionShouldFire(20, false, 'hand:1:2', '')).toBe(false)
  })
})
