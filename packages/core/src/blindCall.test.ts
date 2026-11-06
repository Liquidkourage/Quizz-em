import { describe, expect, it } from 'vitest'
import { adviseBlindCall, medianSeatedStack } from './blindCall'

const typical = { paceSec: 20, guideSec: 45 }

describe('adviseBlindCall', () => {
  it('estimates the current blinds, the next level, and the raise closest to the clock', () => {
    const pace = adviseBlindCall({
      minutesLeft: 60,
      handsLeft: 15,
      players: 40,
      medianStack: 1000,
      smallBlind: 10,
      bigBlind: 20,
      ...typical,
    })
    expect(pace.current).toMatchObject({ smallBlind: 10, bigBlind: 20 })
    expect(Math.round(pace.current.minutes)).toBe(72)
    expect(pace.nextLevel).toMatchObject({ smallBlind: 15, bigBlind: 30 })
    expect(Math.round(pace.nextLevel!.minutes)).toBe(69)
    expect(pace.closestIncrease).toMatchObject({ smallBlind: 40, bigBlind: 80 })
    expect(Math.round(pace.closestIncrease!.minutes)).toBe(59)
    expect(pace.closestIncrease!.bigBlind).toBeGreaterThan(pace.current.bigBlind)
  })

  it('keeps a short clock on the current blinds and only offers a higher level', () => {
    const pace = adviseBlindCall({
      minutesLeft: 90,
      handsLeft: 10,
      players: 30,
      medianStack: 400,
      smallBlind: 50,
      bigBlind: 100,
      ...typical,
    })
    expect(pace.current.bigBlind).toBe(100)
    expect(pace.nextLevel).toMatchObject({ smallBlind: 75, bigBlind: 150 })
    expect(pace.closestIncrease).toMatchObject({ bigBlind: 150 })
    expect(pace.closestIncrease!.bigBlind).toBeGreaterThanOrEqual(pace.current.bigBlind)
    expect(pace.nextLevel!.bigBlind).toBeGreaterThan(pace.current.bigBlind)
  })

  it('stops at the top rung', () => {
    const pace = adviseBlindCall({
      minutesLeft: 40,
      handsLeft: 8,
      players: 16,
      medianStack: 500,
      smallBlind: 400,
      bigBlind: 800,
      ...typical,
    })
    expect(pace.current).toMatchObject({ smallBlind: 400, bigBlind: 800 })
    expect(pace.nextLevel).toBeNull()
    expect(pace.closestIncrease).toBeNull()
  })
})

describe('medianSeatedStack', () => {
  it('uses seated stacks and skips empty chairs', () => {
    expect(
      medianSeatedStack([
        {
          seatNames: ['Ada', '', 'Bea'],
          seatBankrolls: [400, 9000, 800],
        },
        { seatNames: ['Cy'], seatBankrolls: [500] },
      ]),
    ).toBe(500)
  })

  it('returns null when nobody is seated', () => {
    expect(medianSeatedStack([{ seatNames: ['', ''], seatBankrolls: [0, 0] }])).toBeNull()
  })
})
