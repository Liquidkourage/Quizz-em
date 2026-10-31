import { describe, expect, it } from 'vitest'
import { seededPassiveRandom } from './seeded-random'

describe('seededPassiveRandom', () => {
  it('replays the same sequence for the same seed', () => {
    const a = seededPassiveRandom(7)
    const b = seededPassiveRandom(7)
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b))
  })

  it('differs between seeds', () => {
    expect(seededPassiveRandom(1)()).not.toBe(seededPassiveRandom(2)())
  })

  it('stays at or above 0.2 so CPU players never fold, raise, or jam on a roll', () => {
    const next = seededPassiveRandom(123)
    for (let i = 0; i < 5000; i++) {
      const v = next()
      expect(v).toBeGreaterThanOrEqual(0.2)
      expect(v).toBeLessThan(1)
    }
  })
})
