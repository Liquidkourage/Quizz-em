import { describe, expect, it } from 'vitest'
import { adviseBlindCall, medianSeatedStack } from './blindCall'

const typical = { paceSec: 20, guideSec: 45 }

describe('adviseBlindCall', () => {
  it('speeds the blinds when time is long and stacks are still deep', () => {
    const call = adviseBlindCall({
      minutesLeft: 60,
      handsLeft: 15,
      players: 40,
      startedWith: 40,
      medianStack: 1000,
      bigBlind: 20,
      handsPerLevel: 5,
      ...typical,
    })
    expect(call.verb).toBe('Speed up')
    expect(call.bigBlind).toBe(30)
    expect(call.handsPerLevel).toBe(2)
    expect(call.guideSec).toBe(45)
    expect(Math.round(call.minutesIfTaken)).toBe(60)
  })

  it('leaves a critical field alone and shortens the guide', () => {
    const call = adviseBlindCall({
      minutesLeft: 45,
      handsLeft: 15,
      players: 40,
      startedWith: 80,
      medianStack: 300,
      bigBlind: 100,
      handsPerLevel: 2,
      ...typical,
    })
    expect(call.verb).toBe('Cut the guide')
    expect(call.bigBlind).toBe(100)
    expect(call.handsPerLevel).toBe(2)
    expect(call.guideSec).toBe(15)
  })

  it('drops the blinds and stretches the guide when the field is short and the clock is early', () => {
    const call = adviseBlindCall({
      minutesLeft: 90,
      handsLeft: 10,
      players: 30,
      startedWith: 60,
      medianStack: 400,
      bigBlind: 100,
      handsPerLevel: 2,
      ...typical,
    })
    expect(call.verb).toBe('Slow down')
    expect(call.bigBlind).toBe(20)
    expect(call.handsPerLevel).toBe(5)
    expect(call.guideSec).toBe(300)
    expect(Math.round(call.minutesIfTaken)).toBe(83)
  })

  it('holds when the current climb is already near the clock', () => {
    const call = adviseBlindCall({
      minutesLeft: 70,
      handsLeft: 15,
      players: 40,
      startedWith: 40,
      medianStack: 800,
      bigBlind: 25,
      handsPerLevel: 4,
      ...typical,
    })
    expect(call.verb).toBe('Hold')
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
