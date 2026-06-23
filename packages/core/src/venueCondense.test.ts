import { describe, expect, it } from 'vitest'
import {
  computeNextCondenseAtSurvivors,
  listVenueCondenseMilestones,
  mergeTargetTableCount,
  optimalVenueTableCount,
  planVenueCondense,
  shouldScheduleVenueMerge,
  VENUE_CONDENSE_MERGE_MIN_TABLE_DROP,
  VENUE_SEATING_MAX_CLOSURES_PER_ROUND,
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

describe('venue condense thresholds', () => {
  it('mergeMinTableDrop=2: 20 tables merge at 110 survivors', () => {
    expect(VENUE_CONDENSE_MERGE_MIN_TABLE_DROP).toBe(2)
    expect(optimalVenueTableCount(134)).toBeGreaterThan(20 - 2)
    expect(shouldScheduleVenueMerge(20, 134)).toBe(false)
    expect(shouldScheduleVenueMerge(20, 110)).toBe(true)
    expect(mergeTargetTableCount(110)).toBe(18)
    expect(computeNextCondenseAtSurvivors(20, 134)).toBe(110)
  })

  it('returns null at one table', () => {
    expect(computeNextCondenseAtSurvivors(1, 5)).toBeNull()
  })

  it('lists merge ladder from 20 tables down', () => {
    const ladder = listVenueCondenseMilestones(20, 134)
    expect(ladder.length).toBeGreaterThan(0)
    expect(ladder[0]).toEqual({ atSurvivors: 110, fromTables: 20, toTables: 18 })
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]!.atSurvivors).toBeLessThan(ladder[i - 1]!.atSurvivors)
      expect(ladder[i]!.fromTables).toBeLessThanOrEqual(ladder[i - 1]!.toTables)
    }
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
  })

  it('does not rescue lone survivor on only table', () => {
    const plan = planVenueCondense([{ tableNum: 1, players: [p('a', 500)] }], { rng: () => 0 })
    expect(plan.playerMoves).toHaveLength(0)
  })

  it('soft-closes sparse tables instead of shotgun when possible', () => {
    const tables = Array.from({ length: 20 }, (_, i) => roster(i + 1, i < 10 ? 5 : 6))
    const plan = planVenueCondense(tables, { rng: () => 0 })
    expect(plan.scheduledMerge).toBeNull()
    expect(plan.playerMoves.some((m) => m.reason === 'closure')).toBe(true)
  })

  it('limits table closures per round', () => {
    const tables = Array.from({ length: 20 }, (_, i) => roster(i + 1, 5))
    const plan = planVenueCondense(tables, { rng: () => 0 })
    const closedTables = new Set(
      plan.playerMoves.filter((m) => m.reason === 'closure').map((m) => m.fromTableNum),
    )
    expect(closedTables.size).toBeLessThanOrEqual(VENUE_SEATING_MAX_CLOSURES_PER_ROUND)
  })

  it('rebalances uneven tables without changing table count when possible', () => {
    const tables = [roster(1, 8), roster(2, 3), roster(3, 3)]
    const plan = planVenueCondense(tables, { rng: () => 0 })
    expect(plan.scheduledMerge).toBeNull()
    expect(plan.playerMoves.some((m) => m.reason === 'rebalance')).toBe(true)
  })
})
