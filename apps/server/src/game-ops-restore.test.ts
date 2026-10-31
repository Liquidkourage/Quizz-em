import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  bindGameIo,
  isVenueHeld,
  prepareVenuePersistence,
  restoreRoomsFromSnapshot,
  resumeVenueAfterRestartIfHeld,
  rooms,
  setVenueRoomHold,
} from './game-ops'
import { toSnapshotRows } from './room-snapshot'

vi.mock('./venue-library-db', () => ({
  loadVenueLibraries: async () => new Map(),
  persistVenueLibraries: async () => {},
}))

/** Rows as the store would return them: the game rooms saved at `savedAtMs`. */
function savedRows(venue: string, savedAtMs: number, answerDeadline?: number) {
  let gs = addPlayer(createEmptyGame(venue, 'old-host', '1'), 'p1', 'Ann')
  if (answerDeadline != null) gs = { ...gs, round: { ...gs.round, answerDeadline } } as GameState
  return toSnapshotRows(new Map([[`${venue}:1`, gs]])).map((r) => ({ ...r, savedAtMs }))
}

beforeAll(async () => {
  await prepareVenuePersistence()
})

beforeEach(() => {
  vi.useFakeTimers()
  rooms.clear()
  bindGameIo({
    to: () => ({ emit: () => {} }),
    sockets: { sockets: new Map(), adapter: { rooms: new Map() } },
  } as unknown as Server)
})

describe('restoreRoomsFromSnapshot', () => {
  it('puts saved tables and their players back in the rooms map', () => {
    const result = restoreRoomsFromSnapshot(savedRows('R1', 1000), 5000)
    expect(result).toEqual({ tables: 1, venues: ['R1'] })
    expect(rooms.get('R1:1')?.players.map((p) => p.id)).toEqual(['p1'])
  })

  it('freezes each restored venue until the host returns', () => {
    restoreRoomsFromSnapshot(savedRows('R2', 1000), 5000)
    expect(isVenueHeld('r2')).toBe(true)
  })

  it('skips damaged rows, reports them, and still restores the rest', () => {
    const onSkip = vi.fn()
    const rows = [...savedRows('R3', 1000), { sessionKey: 'R3:2', stateJson: 'nope', savedAtMs: 1000 }]
    expect(restoreRoomsFromSnapshot(rows, 5000, onSkip).tables).toBe(1)
    expect(onSkip).toHaveBeenCalledWith('R3:2', 'not valid JSON')
  })

  it('restores nothing and freezes nothing from an empty store', () => {
    expect(restoreRoomsFromSnapshot([], 5000)).toEqual({ tables: 0, venues: [] })
  })
})

describe('resumeVenueAfterRestartIfHeld', () => {
  it('unfreezes a restored venue and pushes the answer deadline back by the whole outage', () => {
    vi.setSystemTime(61_000)
    restoreRoomsFromSnapshot(savedRows('R4', 1_000, 100_000), 61_000)
    expect(resumeVenueAfterRestartIfHeld('r4')).toBe(true)
    expect(isVenueHeld('r4')).toBe(false)
    expect(rooms.get('R4:1')?.round.answerDeadline).toBe(160_000)
  })

  it('resumes only once', () => {
    restoreRoomsFromSnapshot(savedRows('R5', 1_000), 5_000)
    expect(resumeVenueAfterRestartIfHeld('r5')).toBe(true)
    expect(resumeVenueAfterRestartIfHeld('r5')).toBe(false)
  })

  it('leaves a hold the host pressed alone', () => {
    setVenueRoomHold('r6', true)
    expect(resumeVenueAfterRestartIfHeld('r6')).toBe(false)
    expect(isVenueHeld('r6')).toBe(true)
    setVenueRoomHold('r6', false)
  })

  it('does nothing for a venue that was never restored', () => {
    expect(resumeVenueAfterRestartIfHeld('never')).toBe(false)
  })
})
