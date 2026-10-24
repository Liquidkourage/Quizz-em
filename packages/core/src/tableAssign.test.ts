import { describe, expect, it } from 'vitest'
import { computeOptimalTableCount, planLobbyTableGroups, splitIntoTableSizes } from './index'

function assertSplitSumsToTotal(total: number, tableCount: number) {
  const sizes = splitIntoTableSizes(total, tableCount)
  expect(sizes).toHaveLength(Math.max(1, Math.floor(tableCount)))
  expect(sizes.reduce((a, b) => a + b, 0)).toBe(total)
  for (const n of sizes) {
    expect(n).toBeGreaterThanOrEqual(0)
  }
}

describe('splitIntoTableSizes', () => {
  it('splits 11 players across 2 tables as 6 and 5', () => {
    expect(splitIntoTableSizes(11, 2)).toEqual([6, 5])
  })

  it('distributes remainder to the first tables', () => {
    expect(splitIntoTableSizes(10, 3)).toEqual([4, 3, 3])
  })

  it('returns one bucket for non-positive table count after floor', () => {
    expect(splitIntoTableSizes(7, 0)).toEqual([7])
  })

  it('returns zeros when there are no players', () => {
    expect(splitIntoTableSizes(0, 4)).toEqual([0, 0, 0, 0])
  })

  it('always sums to total for random-feeling cases', () => {
    for (let n = 0; n <= 40; n++) {
      for (let t = 1; t <= 8; t++) {
        assertSplitSumsToTotal(n, t)
      }
    }
  })
})

describe('planLobbyTableGroups', () => {
  const players = (ids: string[]) => ids.map((id) => ({ id }))

  it('fills the smallest tables when nobody is pinned', () => {
    const plan = planLobbyTableGroups(players(['a', 'b', 'c', 'd', 'e']), 2, [], 8)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.groups.map((g) => g.map((p) => p.id))).toEqual([
      ['a', 'c', 'e'],
      ['b', 'd'],
    ])
  })

  it('keeps a pinned player on the requested table', () => {
    const plan = planLobbyTableGroups(
      players(['a', 'b', 'c', 'd']),
      2,
      [{ playerId: 'c', tableNum: 1 }],
      8,
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.groups[0]!.map((p) => p.id)).toContain('c')
    expect(plan.groups[1]!.map((p) => p.id)).not.toContain('c')
    expect(plan.groups.flat()).toHaveLength(4)
  })

  it('rejects a table count that would overflow 8 seats', () => {
    const plan = planLobbyTableGroups(players(['a', 'b', 'c']), 1, [], 2)
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.message).toMatch(/at least 2 tables/)
  })

  it('rejects an empty table', () => {
    const plan = planLobbyTableGroups(
      players(['a', 'b']),
      2,
      [
        { playerId: 'a', tableNum: 1 },
        { playerId: 'b', tableNum: 1 },
      ],
      8,
    )
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.message).toMatch(/Table 2 has no one/)
  })
})

describe('computeOptimalTableCount', () => {
  it('returns 1 for non-positive headcount', () => {
    expect(computeOptimalTableCount(0, 8, 2)).toBe(1)
    expect(computeOptimalTableCount(-3, 8, 2)).toBe(1)
  })

  it('always picks at least ceil(N / max) tables', () => {
    for (let n = 1; n <= 50; n++) {
      for (let maxPt = 2; maxPt <= 10; maxPt++) {
        for (let minPt = 1; minPt <= maxPt; minPt++) {
          const t = computeOptimalTableCount(n, maxPt, minPt)
          expect(t).toBeGreaterThanOrEqual(Math.ceil(n / maxPt))
        }
      }
    }
  })

  /** When a split exists respecting both bounds, table count stays in [tLow, tHigh]. */
  function feasible(n: number, maxPt: number, minPt: number): boolean {
    return Math.floor(n / minPt) >= Math.ceil(n / maxPt)
  }

  it('stays within min/max-feasible table-count range when splits exist', () => {
    for (let n = 1; n <= 50; n++) {
      for (let maxPt = 2; maxPt <= 10; maxPt++) {
        for (let minPt = 1; minPt <= maxPt; minPt++) {
          if (!feasible(n, maxPt, minPt)) continue
          const tLow = Math.ceil(n / maxPt)
          const tHigh = Math.floor(n / minPt)
          const t = computeOptimalTableCount(n, maxPt, minPt)
          expect(t).toBeGreaterThanOrEqual(tLow)
          expect(t).toBeLessThanOrEqual(tHigh)
        }
      }
    }
  })

  /** Near-equal shards never exceed max seats when T >= ceil(N/max). */
  it('paired with split yields no shard larger than max', () => {
    for (let n = 1; n <= 50; n++) {
      for (let maxPt = 2; maxPt <= 10; maxPt++) {
        for (let minPt = 1; minPt <= maxPt; minPt++) {
          const t = computeOptimalTableCount(n, maxPt, minPt)
          expect(Math.max(...splitIntoTableSizes(n, t))).toBeLessThanOrEqual(maxPt)
        }
      }
    }
  })

  it('targets ~6 players per table for mid-size groups (default roster limits)', () => {
    expect(computeOptimalTableCount(11, 8, 2)).toBe(2)
    expect(splitIntoTableSizes(11, 2)).toEqual([6, 5])
    expect(computeOptimalTableCount(15, 8, 2)).toBe(3)
    expect(splitIntoTableSizes(15, 3)).toEqual([5, 5, 5])
  })

  it('uses one table for a full octet under default-ish limits', () => {
    expect(computeOptimalTableCount(8, 8, 2)).toBe(1)
    expect(splitIntoTableSizes(8, 1)).toEqual([8])
  })

  it('tight min forces more tables when needed', () => {
    const n = 10
    const maxPt = 10
    const minPt = 5
    expect(computeOptimalTableCount(n, maxPt, minPt)).toBe(2)
    expect(splitIntoTableSizes(n, 2)).toEqual([5, 5])
  })
})
