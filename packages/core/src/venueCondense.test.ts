import { describe, expect, it } from 'vitest'
import {
  handsUntilVenueShuffle,
  isVenueShuffleHand,
  resolveVenueShuffleTick,
  mergeTargetTableCount,
  optimalVenueTableCount,
  compactTableNumbers,
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

function mulberry(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function assignedTables(stacks: number[], seed: number) {
  const players = stacks.map((bankroll, index) => p(`p${index}`, bankroll))
  const mid = Math.ceil(players.length / 2)
  const plan = planVenueCondense(
    [
      { tableNum: 1, players: players.slice(0, mid) },
      { tableNum: 2, players: players.slice(mid) },
    ],
    { shuffle: true, rng: mulberry(seed) },
  )
  return [...plan.scheduledMerge!.assignments.values()]
}

function roster(tableNum: number, count: number) {
  return {
    tableNum,
    players: Array.from({ length: count }, (_, i) => p(`t${tableNum}p${i + 1}`, 500)),
  }
}

describe('compactTableNumbers', () => {
  it('packs a gap so a closed table does not leave a missing number', () => {
    const map = compactTableNumbers([1, 3, 4, 5])
    expect(map.get(1)).toBe(1)
    expect(map.get(3)).toBe(2)
    expect(map.get(4)).toBe(3)
    expect(map.get(5)).toBe(4)
    expect([...map.values()]).toEqual([1, 2, 3, 4])
  })

  it('leaves an already packed set where it is', () => {
    const map = compactTableNumbers([1, 2, 3])
    expect(map.get(1)).toBe(1)
    expect(map.get(2)).toBe(2)
    expect(map.get(3)).toBe(3)
  })
})

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

  it('does not announce a full-room shuffle countdown', () => {
    expect(venueShuffleDisplayFields({ handsCompletedAtVenue: 3, liveTableCount: 1 })).toEqual({
      handsUntilShuffle: null,
      shuffleEveryHands: 5,
    })
    expect(
      venueShuffleDisplayFields({ handsCompletedAtVenue: 3, liveTableCount: 12 }).handsUntilShuffle,
    ).toBeNull()
    expect(
      venueShuffleDisplayFields({
        handsCompletedAtVenue: 3,
        liveTableCount: 12,
        skipNext: true,
      }).handsUntilShuffle,
    ).toBeNull()
  })

  it('skips one shuffle boundary and then resumes the cycle', () => {
    const skipped = resolveVenueShuffleTick({
      handsCompletedAtVenue: 5,
      every: 5,
      skipNext: true,
    })
    expect(skipped.shuffleThisRound).toBe(false)
    expect(skipped.skipNext).toBe(false)
    expect(skipped.handsUntilShuffle).toBe(5)

    const due = resolveVenueShuffleTick({ handsCompletedAtVenue: 10, every: 5, skipNext: false })
    expect(due.shuffleThisRound).toBe(true)
  })
})

describe('planVenueCondense', () => {
  it('fills a short table from the big table before the next hand', () => {
    const tables = [
      {
        tableNum: 9,
        players: [p('bb', 500), p('b', 500), p('c', 500), p('d', 500), p('e', 500), p('f', 500)],
        nextBigBlindIndex: 0,
      },
      { tableNum: 4, players: [p('s1', 500), p('s2', 500), p('s3', 500), p('s4', 500)] },
    ]
    const plan = planVenueCondense(tables, { rng: () => 0 })
    expect(plan.playerMoves).toHaveLength(1)
    expect(plan.playerMoves[0]).toMatchObject({
      playerId: 'bb',
      fromTableNum: 9,
      toTableNum: 4,
      reason: 'balance',
    })
    expect(plan.playerMoves[0]!.byline).toBe('TABLE BALANCE')
  })

  it('closes a one-player table when the others are only one seat larger', () => {
    const tables = [roster(1, 2), roster(4, 1)]
    const plan = planVenueCondense(tables, { rng: () => 0 })
    expect(plan.playerMoves).toHaveLength(1)
    expect(plan.playerMoves[0]).toMatchObject({ playerId: 't4p1', fromTableNum: 4, toTableNum: 1, reason: 'winner' })
    expect(plan.playerMoves[0]!.byline).toBe('TABLE WINNER')
  })

  it('labels a spare table TABLE REDUCTION', () => {
    const tables = [roster(1, 5), roster(2, 1)]
    const plan = planVenueCondense(tables, { rng: () => 0 })
    expect(plan.playerMoves[0]).toMatchObject({
      fromTableNum: 2,
      toTableNum: 1,
      reason: 'reduction',
      byline: 'TABLE REDUCTION',
    })
  })

  it('breaks extra tables down to the count the field can fill', () => {
    const tables = [roster(1, 1), roster(2, 1), roster(4, 1), roster(5, 3), roster(7, 2), roster(8, 2), roster(9, 2)]
    const plan = planVenueCondense(tables, { rng: () => 0 })
    const size = new Map(tables.map((t) => [t.tableNum, t.players.length]))
    for (const move of plan.playerMoves) {
      size.set(move.fromTableNum, (size.get(move.fromTableNum) ?? 0) - 1)
      size.set(move.toTableNum, (size.get(move.toTableNum) ?? 0) + 1)
    }
    const live = [...size.entries()].filter(([, n]) => n > 0)
    expect(live.some(([, n]) => n === 1)).toBe(false)
    expect(live.reduce((n, [, size]) => n + size, 0)).toBe(12)
    expect(live).toHaveLength(mergeTargetTableCount(12))
    expect(plan.playerMoves.every((move) => move.byline.length > 0)).toBe(true)
  })

  it('does not rescue lone survivor on only table', () => {
    const plan = planVenueCondense([{ tableNum: 1, players: [p('a', 500)] }], { rng: () => 0 })
    expect(plan.playerMoves).toHaveLength(0)
  })

  it('evens a crowded table onto the short one when the room already has the right number of tables', () => {
    const tables = [roster(1, 8), roster(2, 5), roster(3, 5)]
    const plan = planVenueCondense(tables, { rng: () => 0 })
    expect(plan.scheduledMerge).toBeNull()
    expect(plan.playerMoves[0]).toMatchObject({ fromTableNum: 1, toTableNum: 2, reason: 'balance' })
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

  it('spreads large and small stacks across both tables on a scheduled shuffle', () => {
    const stacks = [5000, 4500, 4000, 3500, 3000, 2500, 40, 35, 30, 25, 20, 15]
    for (let seed = 1; seed <= 20; seed++) {
      const tables = assignedTables(stacks, seed)
      expect(tables.map((table) => table.length).sort((a, b) => b - a)).toEqual([6, 6])
      for (const table of tables) {
        expect(table.filter((player) => player.bankroll >= 2500)).toHaveLength(3)
        expect(table.filter((player) => player.bankroll <= 40)).toHaveLength(3)
      }
    }
  })

  it('does not seat the same stack mix together on every shuffle', () => {
    const stacks = [5000, 4500, 4000, 3500, 3000, 2500, 40, 35, 30, 25, 20, 15]
    const crews = new Set<string>()
    const leadSeats = new Set<number>()
    for (let seed = 1; seed <= 24; seed++) {
      const tables = assignedTables(stacks, seed)
      const home = tables.find((table) => table.some((player) => player.id === 'p0'))!
      crews.add(home.map((player) => player.id).sort().join(','))
      leadSeats.add(home.findIndex((player) => player.id === 'p0'))
    }
    expect(crews.size).toBeGreaterThan(1)
    expect(leadSeats.size).toBeGreaterThan(1)
  })

  it('keeps a full shuffle fair when the field does not split evenly', () => {
    const stacks = [9000, 8000, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5]
    const tables = assignedTables(stacks, 3)
    const counts = tables.map((table) => table.length).sort((a, b) => b - a)
    expect(counts[0]! - counts[1]!).toBe(1)
    expect(tables.flat()).toHaveLength(13)
    const whale = tables.find((table) => table.some((player) => player.bankroll === 9000))!
    expect(whale.some((player) => player.bankroll <= 100)).toBe(true)
  })

  it('does not shuffle between scheduled hands', () => {
    const tables = [roster(1, 8), roster(2, 3), roster(3, 3)]
    const plan = planVenueCondense(tables, { shuffle: false, rng: () => 0 })
    expect(plan.scheduledMerge).toBeNull()
  })
})
