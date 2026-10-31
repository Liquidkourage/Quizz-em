import { beforeEach, describe, expect, it } from 'vitest'
import { addPlayer, createEmptyGame, LOBBY_TABLE_ID, VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { GameState } from '@qhe/core'
import {
  allSeatedTableSessionsInVenue,
  allTableSessionsInVenue,
  allVenueSessionKeys,
  findPlayerSessionInVenue,
  humanReadableStrictState,
  isLobbySessionKey,
  normalizeTableId,
  normalizeVenueCode,
  phaseStrictSignature,
  rooms,
  tableNumFromSessionKey,
  tableSessionKey,
  venueHasHost,
  venueSessionKeyPrefix,
} from './game-ops'

/** Pins today's behavior of the helpers that name, find and compare table sessions. */

function putRoom(venue: string, tableId: string, opts: { hostId?: string; players?: string[] } = {}): GameState {
  let gs = createEmptyGame(venue.toUpperCase(), opts.hostId ?? '', tableId)
  for (const id of opts.players ?? []) gs = addPlayer(gs, id, `Name ${id}`)
  rooms.set(tableSessionKey(venue, tableId), gs)
  return gs
}

beforeEach(() => {
  rooms.clear()
})

describe('venue and table naming', () => {
  it('trims and upper-cases venue codes', () => {
    expect(normalizeVenueCode('  bar1 ')).toBe('BAR1')
  })

  it('defaults a missing table id to 1', () => {
    expect(normalizeTableId(undefined)).toBe('1')
  })

  it('upper-cases table ids and keeps letters, digits, dash and underscore', () => {
    expect(normalizeTableId(' a-1_b ')).toBe('A-1_B')
  })

  it('drops other characters, and falls back to 1 when nothing is left', () => {
    expect(normalizeTableId('a b!')).toBe('AB')
    expect(normalizeTableId('!!!')).toBe('1')
  })

  it('builds the session key as VENUE:TABLE', () => {
    expect(tableSessionKey('bar1', '2')).toBe('BAR1:2')
    expect(tableSessionKey('bar1')).toBe('BAR1:1')
  })

  it('ends a venue prefix with a colon so BAR does not match BARN', () => {
    expect(venueSessionKeyPrefix('bar')).toBe('BAR:')
  })

  it('recognizes the lobby session', () => {
    expect(isLobbySessionKey(`BAR:${LOBBY_TABLE_ID}`)).toBe(true)
    expect(isLobbySessionKey('BAR:1')).toBe(false)
  })
})

describe('tableNumFromSessionKey', () => {
  it('reads the table number of a numbered table', () => {
    expect(tableNumFromSessionKey('bar', 'BAR:3')).toBe(3)
  })

  it('returns null for the lobby, another venue, or anything that is not a plain table number', () => {
    expect(tableNumFromSessionKey('bar', `BAR:${LOBBY_TABLE_ID}`)).toBeNull()
    expect(tableNumFromSessionKey('bar', 'OTHER:3')).toBeNull()
    expect(tableNumFromSessionKey('bar', 'BAR:03')).toBeNull()
    expect(tableNumFromSessionKey('bar', 'BAR:0')).toBeNull()
    expect(tableNumFromSessionKey('bar', 'BAR:x')).toBeNull()
  })

  it('accepts the highest numbered table and rejects the next one', () => {
    expect(tableNumFromSessionKey('bar', `BAR:${VENUE_NUMBERED_TABLE_MAX}`)).toBe(VENUE_NUMBERED_TABLE_MAX)
    expect(tableNumFromSessionKey('bar', `BAR:${VENUE_NUMBERED_TABLE_MAX + 1}`)).toBeNull()
  })
})

describe('finding sessions in a venue', () => {
  it('lists only the keys of one venue, sorted', () => {
    putRoom('bar', '2')
    putRoom('bar', '1')
    putRoom('barn', '1')
    expect(allVenueSessionKeys('bar')).toEqual(['BAR:1', 'BAR:2'])
  })

  it('finds a host only when some table has a non-blank host id', () => {
    putRoom('bar', '1')
    expect(venueHasHost('bar')).toBe(false)
    putRoom('bar', '2', { hostId: '   ' })
    expect(venueHasHost('bar')).toBe(false)
    putRoom('bar', '3', { hostId: 'host-1' })
    expect(venueHasHost('bar')).toBe(true)
  })

  it('leaves the lobby out of the playable tables', () => {
    putRoom('bar', '1')
    putRoom('bar', LOBBY_TABLE_ID)
    expect(allTableSessionsInVenue('bar')).toEqual(['BAR:1'])
  })

  it('leaves empty tables out of the seated tables', () => {
    putRoom('bar', '1', { players: ['p1'] })
    putRoom('bar', '2')
    expect(allSeatedTableSessionsInVenue('bar')).toEqual(['BAR:1'])
  })

  it('finds the table a player is seated at', () => {
    const gs = putRoom('bar', '2', { players: ['p1'] })
    const hit = findPlayerSessionInVenue('bar', 'p1')
    expect(hit).toEqual({ sessionKey: 'BAR:2', tableId: '2', gameState: gs })
  })

  it('finds a player regardless of how the venue code is typed', () => {
    putRoom('bar', '1', { players: ['p1'] })
    expect(findPlayerSessionInVenue('  Bar ', 'p1')?.sessionKey).toBe('BAR:1')
  })

  it('does not find a player who is unknown or seated in another venue', () => {
    putRoom('bar', '1', { players: ['p1'] })
    putRoom('club', '1', { players: ['p2'] })
    expect(findPlayerSessionInVenue('bar', 'nobody')).toBeNull()
    expect(findPlayerSessionInVenue('bar', 'p2')).toBeNull()
  })
})

describe('phase signatures used for lockstep checks', () => {
  const cards = (n: number) => Array.from({ length: n }, () => ({ digit: 1 as const }))
  const at = (phase: string, round: Record<string, unknown> = {}): GameState => {
    const base = createEmptyGame('V')
    return { ...base, phase, round: { ...base.round, ...round } } as unknown as GameState
  }

  it('names a betting phase by street, clock and board size', () => {
    expect(phaseStrictSignature(at('betting', { bettingRound: 1, isBettingOpen: true, communityCards: [] }))).toBe(
      'bet|1|T|cc0'
    )
    expect(
      phaseStrictSignature(at('betting', { bettingRound: 2, isBettingOpen: false, communityCards: cards(5) }))
    ).toBe('bet|2|F|cc5')
  })

  it('marks an unknown clock with a question mark', () => {
    expect(phaseStrictSignature(at('betting', { bettingRound: 2, isBettingOpen: undefined, communityCards: [] }))).toBe(
      'bet|2|?|cc0'
    )
  })

  it('treats answering as one bucket and reveal with showdown as another', () => {
    expect(phaseStrictSignature(at('answering'))).toBe('answer')
    expect(phaseStrictSignature(at('reveal'))).toBe('postHand')
    expect(phaseStrictSignature(at('showdown'))).toBe('postHand')
  })

  it('uses the phase name for every other phase', () => {
    expect(phaseStrictSignature(at('lobby'))).toBe('lobby')
  })

  it('describes each phase in words for the host', () => {
    expect(humanReadableStrictState(at('betting', { bettingRound: 1, isBettingOpen: false, communityCards: [] }))).toBe(
      'pre-board, clock closed, 0/5 board'
    )
    expect(
      humanReadableStrictState(at('betting', { bettingRound: 2, isBettingOpen: true, communityCards: cards(5) }))
    ).toBe('after board, clock open, 5/5 board')
    expect(humanReadableStrictState(at('betting', { bettingRound: 2, isBettingOpen: undefined }))).toContain(
      'clock unclear'
    )
    expect(humanReadableStrictState(at('answering'))).toBe('answer window')
    expect(humanReadableStrictState(at('reveal'))).toBe('showdown')
    expect(humanReadableStrictState(at('showdown'))).toBe('showdown')
    expect(humanReadableStrictState(at('question'))).toBe('deal setup')
    expect(humanReadableStrictState(at('lobby'))).toBe('lobby between hands')
  })
})
