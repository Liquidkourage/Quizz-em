import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame, VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Socket } from 'socket.io'
import {
  assertHostRole,
  bindSocketAsVenueHost,
  normalizeRehearsalTableCount,
  rooms,
  sanitizeSetlistQuestionIds,
  toastPlayerLabel,
} from './game-ops'

/** Pins who counts as the host, and a few small helpers around hosting. */

function fakeSocket(data: { role?: string; hostAuthed?: boolean }, id = 'sock-1') {
  const toasts: string[] = []
  const socket = {
    id,
    data,
    emit: (event: string, message: string) => {
      if (event === 'toast') toasts.push(message)
    },
  } as unknown as Socket
  return { socket, toasts }
}

beforeEach(() => {
  rooms.clear()
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('RAILWAY_ENVIRONMENT', '')
  vi.stubEnv('RAILWAY_PROJECT_ID', '')
  vi.stubEnv('HOST_SECRET', 'letmein')
})

afterEach(() => vi.unstubAllEnvs())

describe('assertHostRole', () => {
  it('lets an authenticated host through', () => {
    const { socket, toasts } = fakeSocket({ role: 'host', hostAuthed: true })
    expect(assertHostRole(socket)).toBe(true)
    expect(toasts).toEqual([])
  })

  it('refuses a player or display socket', () => {
    const { socket, toasts } = fakeSocket({ role: 'player', hostAuthed: true })
    expect(assertHostRole(socket)).toBe(false)
    expect(toasts).toEqual(['Only the host can perform this action.'])
  })

  it('refuses a host who has not passed the secret check', () => {
    const { socket, toasts } = fakeSocket({ role: 'host', hostAuthed: false })
    expect(assertHostRole(socket)).toBe(false)
    expect(toasts).toEqual(['Host session is not authenticated (check HOST_SECRET).'])
  })

  it('refuses everyone on a deployed server that has no HOST_SECRET', () => {
    vi.stubEnv('HOST_SECRET', '')
    vi.stubEnv('RAILWAY_ENVIRONMENT', 'production')
    const { socket, toasts } = fakeSocket({ role: 'host', hostAuthed: true })
    expect(assertHostRole(socket)).toBe(false)
    expect(toasts).toEqual(['Host login is not configured on this server.'])
  })
})

describe('bindSocketAsVenueHost', () => {
  it('points every table in the venue at the new host socket and leaves other venues alone', () => {
    rooms.set('BAR:1', createEmptyGame('BAR', 'old', '1'))
    rooms.set('BAR:LOBBY', createEmptyGame('BAR', 'old', 'LOBBY'))
    rooms.set('CLUB:1', createEmptyGame('CLUB', 'other', '1'))
    bindSocketAsVenueHost(fakeSocket({}, 'new-host').socket, 'bar')
    expect(rooms.get('BAR:1')?.hostId).toBe('new-host')
    expect(rooms.get('BAR:LOBBY')?.hostId).toBe('new-host')
    expect(rooms.get('CLUB:1')?.hostId).toBe('other')
  })
})

describe('small helpers', () => {
  it('keeps only setlist question ids that exist in the library, in order', () => {
    const lib = { questions: [{ id: 'a' }, { id: 'b' }], setlists: [] } as unknown as Parameters<
      typeof sanitizeSetlistQuestionIds
    >[0]
    expect(sanitizeSetlistQuestionIds(lib, ['b', 'zzz', 'a'])).toEqual(['b', 'a'])
  })

  it('clamps the rehearsal table count to 1 through the table maximum', () => {
    expect(normalizeRehearsalTableCount(undefined)).toBe(VENUE_NUMBERED_TABLE_MAX)
    expect(normalizeRehearsalTableCount(0)).toBe(1)
    expect(normalizeRehearsalTableCount(3.9)).toBe(3)
    expect(normalizeRehearsalTableCount(999)).toBe(VENUE_NUMBERED_TABLE_MAX)
    expect(normalizeRehearsalTableCount('abc')).toBe(VENUE_NUMBERED_TABLE_MAX)
  })

  it('labels a player by short name, and falls back to Player when unknown', () => {
    const gs: GameState = addPlayer(createEmptyGame('BAR', 'h', '1'), 'p1', 'Ann Lee')
    expect(toastPlayerLabel(gs, 'p1')).toBe('Ann L.')
    expect(toastPlayerLabel(gs, 'ghost')).toBe('Player')
  })
})
