import { describe, expect, it } from 'vitest'
import { createEmptyGame, type GameState } from '@qhe/core'
import {
  applyVenueCondenseAfterRound,
  compactVenueTableNumbers,
  unsettledAllInPassengers,
  type VenueCondenseApplyDeps,
} from './venue-condense'

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

describe('compactVenueTableNumbers', () => {
  it('moves table 3 into table 2 when table 2 is gone', () => {
    const rooms = new Map<string, GameState>()
    const seat = (tableNum: number, id: string) => {
      const gs = createEmptyGame('V', 'host', String(tableNum))
      gs.players = [
        { id, name: id, bankroll: 500, hand: [], hasFolded: false, isAllIn: false },
      ]
      rooms.set(`V:${tableNum}`, gs)
    }
    seat(1, 'ada')
    seat(3, 'cam')
    const moved: string[] = []
    const deps = {
      venueCode: 'V',
      getState: (key: string) => rooms.get(key),
      setState: (key: string, gs: GameState) => rooms.set(key, gs),
      tableSessionKey: (code: string, tableId: string) => `${code}:${tableId}`,
      tableNumFromSessionKey: (_code: string, key: string) => Number(key.split(':')[1]),
      allTableSessionKeys: () => [...rooms.keys()],
      applyEffectiveBlinds: (gs: GameState) => gs,
      emitTableState: () => {},
      moveHumanSocket: (playerId: string, toKey: string) => moved.push(`${playerId}->${toKey}`),
      io: { to: () => ({ emit: () => {} }) },
      hostId: 'host',
    } as VenueCondenseApplyDeps

    const map = compactVenueTableNumbers(deps)

    expect(map.get(3)).toBe(2)
    expect(rooms.get('V:1')?.players.map((p) => p.id)).toEqual(['ada'])
    expect(rooms.get('V:2')?.players.map((p) => p.id)).toEqual(['cam'])
    expect(rooms.get('V:3')?.players ?? []).toEqual([])
    expect(moved).toContain('cam->V:2')
  })

  it('packs live tables 1, 3, 4, 5 into 1, 2, 3, 4 after the break', () => {
    const rooms = new Map<string, GameState>()
    for (const tableNum of [1, 3, 4, 5]) {
      const gs = createEmptyGame('V', 'host', String(tableNum))
      gs.players = [0, 1].map((seat) => ({
        id: `t${tableNum}s${seat}`,
        name: `t${tableNum}s${seat}`,
        bankroll: 500,
        hand: [],
        hasFolded: false,
        isAllIn: false,
      }))
      rooms.set(`V:${tableNum}`, gs)
    }
    const deps = {
      venueCode: 'V',
      getState: (key: string) => rooms.get(key),
      setState: (key: string, gs: GameState) => rooms.set(key, gs),
      tableSessionKey: (code: string, tableId: string) => `${code}:${tableId}`,
      tableNumFromSessionKey: (_code: string, key: string) => Number(key.split(':')[1]),
      allTableSessionKeys: () => [...rooms.keys()],
      applyEffectiveBlinds: (gs: GameState) => gs,
      emitTableState: () => {},
      moveHumanSocket: () => {},
      io: { to: () => ({ emit: () => {} }) },
      hostId: 'host',
    } as VenueCondenseApplyDeps

    const result = applyVenueCondenseAfterRound(deps, { shuffle: false })

    expect(result.seatingMoves).toEqual([])
    expect(result.closedTableNums).toEqual([])
    expect(rooms.get('V:2')?.players.map((p) => p.id)).toEqual(['t3s0', 't3s1'])
    expect(rooms.get('V:3')?.players.map((p) => p.id)).toEqual(['t4s0', 't4s1'])
    expect(rooms.get('V:4')?.players.map((p) => p.id)).toEqual(['t5s0', 't5s1'])
    expect(rooms.get('V:5')?.players ?? []).toEqual([])
    expect(rooms.get('V:1')?.players.map((p) => p.id)).toEqual(['t1s0', 't1s1'])
  })
})
