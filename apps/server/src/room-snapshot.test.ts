import { describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import {
  DEFAULT_SNAPSHOT_MAX_AGE_MS,
  dropStaleVenues,
  fromSnapshotRows,
  SNAPSHOT_VERSION,
  snapshotMaxAgeMs,
  toSnapshotRows,
} from './room-snapshot'

function sampleRooms(): Map<string, GameState> {
  const rooms = new Map<string, GameState>()
  rooms.set('BAR:1', addPlayer(addPlayer(createEmptyGame('BAR', 'host-1', '1'), 'p1', 'Ann'), 'p2', 'Bo'))
  rooms.set('BAR:2', createEmptyGame('BAR', 'host-1', '2'))
  return rooms
}

describe('room snapshots', () => {
  it('round-trips every table with players, phase and round state intact', () => {
    const rooms = sampleRooms()
    const restored = fromSnapshotRows(toSnapshotRows(rooms))
    expect([...restored.keys()]).toEqual(['BAR:1', 'BAR:2'])
    expect(restored.get('BAR:1')).toEqual(rooms.get('BAR:1'))
    expect(restored.get('BAR:1')?.players.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('writes one row per table, tagged with the snapshot version', () => {
    const rows = toSnapshotRows(sampleRooms())
    expect(rows.map((r) => r.sessionKey)).toEqual(['BAR:1', 'BAR:2'])
    expect(JSON.parse(rows[0]!.stateJson).v).toBe(SNAPSHOT_VERSION)
  })

  it('skips and reports a row that is not valid JSON, and keeps the good rows', () => {
    const onSkip = vi.fn()
    const rows = [...toSnapshotRows(sampleRooms()), { sessionKey: 'BAR:3', stateJson: '{oops' }]
    const restored = fromSnapshotRows(rows, onSkip)
    expect(restored.size).toBe(2)
    expect(onSkip).toHaveBeenCalledWith('BAR:3', 'not valid JSON')
  })

  it('skips a row saved by a different snapshot version', () => {
    const onSkip = vi.fn()
    const old = { sessionKey: 'BAR:1', stateJson: JSON.stringify({ v: 0, state: {} }) }
    expect(fromSnapshotRows([old], onSkip).size).toBe(0)
    expect(onSkip).toHaveBeenCalledWith('BAR:1', 'unsupported snapshot version 0')
  })

  it('skips a row whose state is not shaped like a game', () => {
    const onSkip = vi.fn()
    const bad = { sessionKey: 'BAR:1', stateJson: JSON.stringify({ v: SNAPSHOT_VERSION, state: { code: 'BAR' } }) }
    expect(fromSnapshotRows([bad], onSkip).size).toBe(0)
    expect(onSkip).toHaveBeenCalledWith('BAR:1', 'not a game state')
  })

  it('restores nothing from no rows', () => {
    expect(fromSnapshotRows([]).size).toBe(0)
  })
})

const HOUR = 60 * 60 * 1000
const row = (sessionKey: string, savedAtMs?: number) => ({ sessionKey, stateJson: '{}', savedAtMs })

describe('dropStaleVenues', () => {
  it('keeps venues saved within the limit and drops older ones', () => {
    const now = 100 * HOUR
    const { fresh, droppedVenues } = dropStaleVenues([row('NEW:1', now - HOUR), row('OLD:1', now - 13 * HOUR)], now, 12 * HOUR)
    expect(fresh.map((r) => r.sessionKey)).toEqual(['NEW:1'])
    expect(droppedVenues).toEqual(['OLD'])
  })

  it('keeps a whole venue while any one of its tables is fresh', () => {
    const now = 100 * HOUR
    const rows = [row('V:LOBBY', now - 30 * HOUR), row('V:1', now - HOUR)]
    const { fresh, droppedVenues } = dropStaleVenues(rows, now, 12 * HOUR)
    expect(fresh).toHaveLength(2)
    expect(droppedVenues).toEqual([])
  })

  it('keeps rows that have no save time', () => {
    expect(dropStaleVenues([row('X:1')], 100 * HOUR, HOUR).fresh).toHaveLength(1)
  })

  it('treats a row exactly at the limit as fresh', () => {
    expect(dropStaleVenues([row('X:1', 88 * HOUR)], 100 * HOUR, 12 * HOUR).fresh).toHaveLength(1)
  })
})

describe('snapshotMaxAgeMs', () => {
  it('defaults to 12 hours', () => {
    expect(snapshotMaxAgeMs({})).toBe(DEFAULT_SNAPSHOT_MAX_AGE_MS)
    expect(DEFAULT_SNAPSHOT_MAX_AGE_MS).toBe(12 * HOUR)
  })

  it('reads SNAPSHOT_MAX_AGE_HOURS and ignores bad values', () => {
    expect(snapshotMaxAgeMs({ SNAPSHOT_MAX_AGE_HOURS: '2' })).toBe(2 * HOUR)
    expect(snapshotMaxAgeMs({ SNAPSHOT_MAX_AGE_HOURS: '0.5' })).toBe(HOUR / 2)
    for (const bad of ['0', '-3', 'abc', '']) expect(snapshotMaxAgeMs({ SNAPSHOT_MAX_AGE_HOURS: bad })).toBe(DEFAULT_SNAPSHOT_MAX_AGE_MS)
  })
})
