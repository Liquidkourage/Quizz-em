import { describe, expect, it } from 'vitest'
import { unsettledAllInPassengers } from './venue-condense'

describe('unsettledAllInPassengers', () => {
  it('keeps an all-in player who has not been paid out, and leaves a points-only player off', () => {
    const kept = unsettledAllInPassengers([
      { id: 'all-in', bankroll: 0, pointsOnly: false },
      { id: 'points', bankroll: 0, pointsOnly: true },
      { id: 'stack', bankroll: 400, pointsOnly: false },
    ])
    expect(kept.map((p) => p.id)).toEqual(['all-in'])
  })
})
