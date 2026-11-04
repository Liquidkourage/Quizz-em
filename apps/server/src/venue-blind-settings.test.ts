import { describe, expect, it } from 'vitest'
import { advanceBlindLevel, applyBlindScheduleSave, type VenueBlindSettings } from './venue-blind-settings'

function raised(): VenueBlindSettings {
  return {
    smallBlind: 40,
    bigBlind: 80,
    blindLevelIndex: 0,
    handsPerBlindLevel: 3,
    handsAtCurrentLevel: 1,
    levels: [
      { smallBlind: 10, bigBlind: 20 },
      { smallBlind: 15, bigBlind: 30 },
    ],
  }
}

describe('manual blind increases', () => {
  it('keeps the increase when the pace line saves the schedule', () => {
    const next = applyBlindScheduleSave(raised(), 3)
    expect(next.smallBlind).toBe(40)
    expect(next.bigBlind).toBe(80)
    expect(next.handsPerBlindLevel).toBe(3)
    expect(next.handsAtCurrentLevel).toBe(1)
  })

  it('keeps the increase on the next hand until the level actually changes', () => {
    const { next, leveledUp } = advanceBlindLevel(raised())
    expect(leveledUp).toBe(false)
    expect(next.smallBlind).toBe(40)
    expect(next.bigBlind).toBe(80)
    expect(next.handsAtCurrentLevel).toBe(2)
  })

  it('uses the next rung when the level changes', () => {
    const { next, leveledUp } = advanceBlindLevel({ ...raised(), handsAtCurrentLevel: 2 })
    expect(leveledUp).toBe(true)
    expect(next.smallBlind).toBe(15)
    expect(next.bigBlind).toBe(30)
    expect(next.blindLevelIndex).toBe(1)
  })
})
