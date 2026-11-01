import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, type GamePhase, type GameState } from '@qhe/core'
import {
  alignOutlierTablesInRooms,
  forceTablePhase,
  phaseStrictSignature,
  rooms,
  setOneTablePhase,
  tableSessionKey,
} from './game-ops'

function felt(venue: string, tableId: string, phase: GamePhase, roundPatch: Partial<GameState['round']> = {}): void {
  let gs = createEmptyGame(venue, 'host', tableId)
  gs = addPlayer(gs, `${venue}-${tableId}-a`, 'Ada')
  gs = addPlayer(gs, `${venue}-${tableId}-b`, 'Bea')
  rooms.set(tableSessionKey(venue, tableId), {
    ...gs,
    phase,
    round: { ...gs.round, ...roundPatch },
  })
}

beforeEach(() => {
  rooms.clear()
})
afterEach(() => {
  rooms.clear()
})

describe('forceTablePhase', () => {
  it('pulls a results table back to guessing', () => {
    felt('A', '1', 'showdown', { communityCards: [{ digit: 1 }, { digit: 2 }, { digit: 3 }, { digit: 4 }, { digit: 5 }], bettingRound: 2 })
    const gs = rooms.get(tableSessionKey('A', '1'))!
    const next = forceTablePhase(gs, 'answer')
    expect(next).not.toBeNull()
    expect(phaseStrictSignature(next!)).toBe('answer')
  })

  it('opens pre-board betting and clears a dealt board', () => {
    felt('A', '1', 'answering', {
      communityCards: [{ digit: 1 }, { digit: 2 }, { digit: 3 }, { digit: 4 }, { digit: 5 }],
      bettingRound: 2,
      isBettingOpen: false,
    })
    const next = forceTablePhase(rooms.get(tableSessionKey('A', '1'))!, 'bet|1|T|cc0')
    expect(phaseStrictSignature(next!)).toBe('bet|1|T|cc0')
    expect(next!.round.communityCards).toEqual([])
    expect(next!.round.isBettingOpen).toBe(true)
  })

  it('deals a board and closes the clock when the target is post-board betting', () => {
    felt('A', '1', 'betting', { bettingRound: 1, isBettingOpen: true, communityCards: [] })
    const next = forceTablePhase(rooms.get(tableSessionKey('A', '1'))!, 'bet|2|F|cc5')
    expect(phaseStrictSignature(next!)).toBe('bet|2|F|cc5')
    expect(next!.round.communityCards).toHaveLength(5)
    expect(next!.round.isBettingOpen).toBe(false)
  })

  it('rejects a phase the host cannot set', () => {
    felt('A', '1', 'lobby')
    expect(forceTablePhase(rooms.get(tableSessionKey('A', '1'))!, 'intermission')).toBeNull()
  })
})

describe('alignOutlierTablesInRooms', () => {
  it('moves only the tables that differ from the majority beat', () => {
    felt('B', '1', 'answering', { answerDeadline: 9000 })
    felt('B', '2', 'answering', { answerDeadline: 9000 })
    felt('B', '3', 'showdown')
    const result = alignOutlierTablesInRooms('b')
    expect(result).toEqual({ ok: true, tables: [3], signature: 'answer' })
    expect(phaseStrictSignature(rooms.get(tableSessionKey('B', '1'))!)).toBe('answer')
    expect(phaseStrictSignature(rooms.get(tableSessionKey('B', '3'))!)).toBe('answer')
    expect(rooms.get(tableSessionKey('B', '3'))!.round.answerDeadline).toBe(9000)
  })

  it('does not pick a side when the room is split evenly', () => {
    felt('C', '1', 'answering')
    felt('C', '2', 'showdown')
    const result = alignOutlierTablesInRooms('c')
    expect(result.ok).toBe(false)
    expect(rooms.get(tableSessionKey('C', '1'))!.phase).toBe('answering')
    expect(rooms.get(tableSessionKey('C', '2'))!.phase).toBe('showdown')
  })
})

describe('setOneTablePhase', () => {
  it('sets one table and leaves the others', () => {
    felt('D', '1', 'betting', { isBettingOpen: true })
    felt('D', '2', 'betting', { isBettingOpen: true })
    const result = setOneTablePhase('d', 2, 'answer')
    expect(result).toEqual({ ok: true, tableNum: 2, signature: 'answer' })
    expect(phaseStrictSignature(rooms.get(tableSessionKey('D', '1'))!)).toBe('bet|1|T|cc0')
    expect(phaseStrictSignature(rooms.get(tableSessionKey('D', '2'))!)).toBe('answer')
  })
})
