import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import type { Server } from 'socket.io'
import {
  bindGameIo,
  isVenueHeld,
  prepareVenuePersistence,
  restoreRoomsFromSnapshot,
  cpuVpDrainPending,
  resumeVenueAfterRestartIfHeld,
  rooms,
  setVenueRoomHold,
  venueShowdownAtMs,
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

  it('forfeits an open guess when the nudge clock ran out during the outage', () => {
    vi.setSystemTime(61_000)
    let gs = addPlayer(createEmptyGame('R8', 'old-host', '3'), 'p1', 'Ann')
    gs = addPlayer(gs, 'p2', 'Bo')
    gs = {
      ...gs,
      phase: 'answering',
      players: gs.players.map((player, index) =>
        index === 0 ? { ...player, submittedAnswer: 8 } : player,
      ),
      round: {
        ...gs.round,
        answerDeadline: 100_000,
        guessNudge: true,
        guessNudgeDeadline: 1_000,
      },
    }
    const rows = toSnapshotRows(new Map([['R8:3', gs]])).map((row) => ({ ...row, savedAtMs: 1_000 }))
    restoreRoomsFromSnapshot(rows, 61_000)
    expect(resumeVenueAfterRestartIfHeld('r8')).toBe(true)
    expect(rooms.get('R8:3')?.players.find((player) => player.id === 'p2')?.answerForfeited).toBe(true)
  })

  it('lets unanswered bots keep going and restores the answer guide when the host comes back', () => {
    vi.setSystemTime(61_000)
    let gs = addPlayer(createEmptyGame('R7', 'old-host', '1'), 'vp:1', 'Ada')
    gs = {
      ...gs,
      phase: 'answering',
      round: { ...gs.round, answerDeadline: 100_000 },
    }
    const rows = toSnapshotRows(new Map([['R7:1', gs]])).map((row) => ({ ...row, savedAtMs: 1_000 }))
    restoreRoomsFromSnapshot(rows, 61_000)
    cpuVpDrainPending.delete('R7:1')
    venueShowdownAtMs.delete('R7')
    expect(resumeVenueAfterRestartIfHeld('r7')).toBe(true)
    expect(cpuVpDrainPending.has('R7:1')).toBe(true)
    expect(venueShowdownAtMs.get('R7')).toBe(160_000)
  })
})
