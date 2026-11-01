import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Socket } from 'socket.io'
import {
  requireAllSeatedTablesSatisfy,
  requireVenueLockstepTables,
  revealVenueAnswersTogether,
  rooms,
  tableSessionKey,
  toastVenueMisaligned,
  venuePlayableSnapshots,
} from './game-ops'

/** Pins the guards that stop the host advancing the venue while tables disagree about the phase. */

function host() {
  const toasts: string[] = []
  const socket = { emit: (event: string, msg: string) => void (event === 'toast' && toasts.push(msg)) } as unknown as Socket
  return { socket, toasts }
}

function seat(venue: string, tableId: string, phase: string, players = 1): void {
  let gs = createEmptyGame(venue, 'host', tableId)
  for (let i = 0; i < players; i++) gs = addPlayer(gs, `${venue}-${tableId}-p${i}`, `P${i}`)
  rooms.set(tableSessionKey(venue, tableId), { ...gs, phase } as unknown as GameState)
}

const isLobby = (gs: GameState) => gs.phase === 'lobby'

beforeEach(() => {
  rooms.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('venuePlayableSnapshots', () => {
  it('lists seated numbered tables in table order and leaves out empty tables and the lobby', () => {
    seat('L0', '10', 'lobby')
    seat('L0', '2', 'lobby')
    seat('L0', 'LOBBY', 'lobby')
    seat('L0', '3', 'lobby', 0)
    expect(venuePlayableSnapshots('l0').map((r) => r.n)).toEqual([2, 10])
  })
})

describe('requireVenueLockstepTables', () => {
  it('says to assign the lobby when no table is seated', () => {
    const { socket, toasts } = host()
    expect(requireVenueLockstepTables(socket, 'none', isLobby, 'be waiting')).toBeNull()
    expect(toasts).toEqual(['No playable tables yet — assign the lobby first.'])
  })

  it('returns the tables when they agree and the predicate holds', () => {
    seat('L1', '2', 'lobby')
    seat('L1', '1', 'lobby')
    const { socket, toasts } = host()
    const rows = requireVenueLockstepTables(socket, 'l1', isLobby, 'be waiting')
    expect(rows?.map((r) => r.n)).toEqual([1, 2])
    expect(toasts).toEqual([])
  })

  it('refuses when tables are in different phases and names who is where', () => {
    seat('L2', '1', 'answering')
    seat('L2', '2', 'lobby')
    const { socket, toasts } = host()
    expect(requireVenueLockstepTables(socket, 'l2', () => true, 'be waiting')).toBeNull()
    expect(toasts).toEqual([
      'Tables are out of sync (1→answer window · 2→lobby between hands). Fix the stragglers so every felt matches before advancing.',
    ])
  })

  it('refuses when the tables agree but are not ready for this action', () => {
    seat('L3', '1', 'answering')
    seat('L3', '2', 'answering')
    const { socket, toasts } = host()
    expect(requireVenueLockstepTables(socket, 'l3', isLobby, 'be waiting')).toBeNull()
    expect(toasts).toEqual(['Every table must be waiting (yours collectively: answer window).'])
  })
})

describe('toastVenueMisaligned', () => {
  it('groups tables that share a phase', () => {
    seat('L4', '1', 'answering')
    seat('L4', '2', 'answering')
    seat('L4', '3', 'lobby')
    const { socket, toasts } = host()
    toastVenueMisaligned(socket, venuePlayableSnapshots('l4'))
    expect(toasts[0]).toContain('(1,2→answer window · 3→lobby between hands)')
  })
})

describe('revealVenueAnswersTogether', () => {
  it('leaves every table untouched while any felt is still betting', () => {
    seat('L7', '1', 'answering')
    seat('L7', '2', 'answering')
    seat('L7', '3', 'betting')
    const { socket, toasts } = host()
    expect(revealVenueAnswersTogether(socket, 'l7')).toBe(false)
    expect(rooms.get(tableSessionKey('L7', '1'))!.phase).toBe('answering')
    expect(rooms.get(tableSessionKey('L7', '2'))!.phase).toBe('answering')
    expect(rooms.get(tableSessionKey('L7', '3'))!.phase).toBe('betting')
    expect(toasts[0]).toContain('out of sync')
  })

  it('reveals every seated table in one beat when all are answering', () => {
    seat('L8', '1', 'answering')
    seat('L8', '2', 'answering')
    seat('L8', '3', 'answering')
    const { socket, toasts } = host()
    expect(revealVenueAnswersTogether(socket, 'l8')).toBe(true)
    expect(rooms.get(tableSessionKey('L8', '1'))!.phase).toBe('reveal')
    expect(rooms.get(tableSessionKey('L8', '2'))!.phase).toBe('reveal')
    expect(rooms.get(tableSessionKey('L8', '3'))!.phase).toBe('reveal')
    expect(toasts).toEqual([])
  })
})

describe('requireAllSeatedTablesSatisfy', () => {
  it('says to assign the lobby when no table is seated', () => {
    const { socket, toasts } = host()
    expect(requireAllSeatedTablesSatisfy(socket, 'none', isLobby, 'be waiting')).toBeNull()
    expect(toasts).toEqual(['No playable tables yet — assign the lobby first.'])
  })

  it('lets mixed phases through as long as every table satisfies the predicate', () => {
    seat('L5', '1', 'lobby')
    seat('L5', '2', 'lobby')
    const { socket } = host()
    expect(requireAllSeatedTablesSatisfy(socket, 'l5', isLobby, 'be waiting')?.length).toBe(2)
  })

  it('lists the failing tables in numeric order', () => {
    seat('L6', '10', 'answering')
    seat('L6', '2', 'answering')
    seat('L6', '1', 'lobby')
    const { socket, toasts } = host()
    expect(requireAllSeatedTablesSatisfy(socket, 'l6', isLobby, 'be waiting')).toBeNull()
    expect(toasts).toEqual([
      'Tables 2, 10 must be waiting (e.g. answer window). Close wagering round 1 on stragglers or align the venue, then try again.',
    ])
  })
})
