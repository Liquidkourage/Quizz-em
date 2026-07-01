import { describe, expect, it } from 'vitest'
import {
  handsUntilVenueShuffle,
  isVenueShuffleHand,
  mergeTargetTableCount,
  optimalVenueTableCount,
  planVenueCondense,
  VENUE_SHUFFLE_EVERY_HANDS,
  venueShuffleDisplayFields,
} from './venueCondense'
import type { PlayerState } from './index'

function p(id: string, bankroll: number): PlayerState {
  return {
    id,
    name: id,
    bankroll,
    hand: [],
    hasFolded: false,
    isAllIn: false,
  }
}

function roster(tableNum: number, count: number) {
  return {
    tableNum,
    players: Array.from({ length: count }, (_, i) => p(`t${tableNum}p${i + 1}`, 500)),
  }
}

describe('venue shuffle schedule', () => {
  it('every 5 hands', () => {
    expect(VENUE_SHUFFLE_EVERY_HANDS).toBe(5)
    expect(handsUntilVenueShuffle(0)).toBe(5)
    expect(handsUntilVenueShuffle(1)).toBe(4)
    expect(handsUntilVenueShuffle(4)).toBe(1)
    expect(handsUntilVenueShuffle(5)).toBe(5)
    expect(isVenueShuffleHand(4)).toBe(false)
    expect(isVenueShuffleHand(5)).toBe(true)
    expect(isVenueShuffleHand(10)).toBe(true)
  })

  it('display fields hide countdown at final table', () => {
    expect(venueShuffleDisplayFields({ handsCompletedAtVenue: 3, liveTableCount: 1 })).toEqual({
      handsUntilShuffle: null,
      shuffleEveryHands: 5,
    })
    expect(
      venueShuffleDisplayFields({ handsCompletedAtVenue: 3, liveTableCount: 12 }).handsUntilShuffle,
    ).toBe(2)
  })
})

describe('planVenueCondense', () => {
  it('rescues solo table to the lowest table with room', () => {
    const tables = [
      { tableNum: 1, players: [p('a', 500), p('b', 500), p('c', 500)] },
      { tableNum: 2, players: [p('solo', 500)] },
    ]
    const plan = planVenueCondense(tables, { rng: () => 0 })
    const soloMoves = plan.playerMoves.filter((m) => m.reason === 'solo')
    expect(soloMoves).toHaveLength(1)
    expect(soloMoves[0]!.fromTableNum).toBe(2)
    expect(soloMoves[0]!.toTableNum).toBe(1)
    expect(plan.scheduledMerge).toBeNull()
  })

  it('does not rescue lone survivor on only table', () => {
    const plan = planVenueCondense([{ tableNum: 1, players: [p('a', 500)] }], { rng: () => 0 })
    expect(plan.playerMoves).toHaveLength(0)
  })

  it('does not move players when table count is optimal but sizes are uneven', () => {
    const tables = [roster(1, 8), roster(2, 5), roster(3, 5)]
    const plan = planVenueCondense(tables, { rng: () => 0 })
    expect(plan.scheduledMerge).toBeNull()
    expect(plan.playerMoves).toHaveLength(0)
  })

  it('shuffles all survivors into optimal tables on shuffle hands', () => {
    const tables = Array.from({ length: 20 }, (_, i) => roster(i + 1, i < 10 ? 5 : 6))
    const plan = planVenueCondense(tables, { rng: () => 0, shuffle: true })
    expect(plan.scheduledMerge).not.toBeNull()
    const survivors = tables.reduce((n, t) => n + t.players.length, 0)
    expect(plan.scheduledMerge!.targetTableCount).toBe(optimalVenueTableCount(survivors))
    expect(plan.scheduledMerge!.targetTableCount).toBe(mergeTargetTableCount(survivors))
    const assigned = [...plan.scheduledMerge!.assignments.values()].flat()
    expect(assigned).toHaveLength(survivors)
  })

  it('skips shuffle on a single table', () => {
    const plan = planVenueCondense([roster(1, 6)], { shuffle: true, rng: () => 0 })
    expect(plan.scheduledMerge).toBeNull()
  })

  it('does not shuffle between scheduled hands', () => {
    const tables = [roster(1, 8), roster(2, 3), roster(3, 3)]
    const plan = planVenueCondense(tables, { shuffle: false, rng: () => 0 })
    expect(plan.scheduledMerge).toBeNull()
  })
})
