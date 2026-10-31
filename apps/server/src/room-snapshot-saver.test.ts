import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addPlayer, createEmptyGame } from '@qhe/core'
import type { GameState } from '@qhe/core'
import { startRoomSnapshotSaver } from './room-snapshot-saver'
import type { RoomSnapshotStore } from './room-snapshot-store'

function fakeStore(failTimes = 0) {
  let failures = failTimes
  const saves: string[][] = []
  const store: RoomSnapshotStore = {
    loadAll: async () => [],
    replaceAll: async (rows) => {
      if (failures > 0) {
        failures -= 1
        throw new Error('db down')
      }
      saves.push(rows.map((r) => r.sessionKey))
    },
  }
  return { store, saves }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('room snapshot saver', () => {
  it('saves on the interval when a table exists, and stays quiet when nothing changed', async () => {
    const rooms = new Map<string, GameState>([['BAR:1', createEmptyGame('BAR', 'h', '1')]])
    const { store, saves } = fakeStore()
    const saver = startRoomSnapshotSaver({ rooms, store, intervalMs: 1000 })
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(3000)
    expect(saves).toEqual([['BAR:1']])
    saver.stop()
  })

  it('saves again after a table changes', async () => {
    const rooms = new Map<string, GameState>([['BAR:1', createEmptyGame('BAR', 'h', '1')]])
    const { store, saves } = fakeStore()
    const saver = startRoomSnapshotSaver({ rooms, store, intervalMs: 1000 })
    await vi.advanceTimersByTimeAsync(1000)
    rooms.set('BAR:1', addPlayer(rooms.get('BAR:1')!, 'p1', 'Ann'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(saves).toHaveLength(2)
    saver.stop()
  })

  it('logs a failed save instead of throwing, and retries on the next tick', async () => {
    const rooms = new Map<string, GameState>([['BAR:1', createEmptyGame('BAR', 'h', '1')]])
    const { store, saves } = fakeStore(1)
    const log = vi.fn()
    const saver = startRoomSnapshotSaver({ rooms, store, intervalMs: 1000, log })
    await vi.advanceTimersByTimeAsync(1000)
    expect(log).toHaveBeenCalledTimes(1)
    expect(saves).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1000)
    expect(saves).toEqual([['BAR:1']])
    saver.stop()
  })

  it('flush saves immediately, for use at shutdown', async () => {
    const rooms = new Map<string, GameState>([['BAR:2', createEmptyGame('BAR', 'h', '2')]])
    const { store, saves } = fakeStore()
    const saver = startRoomSnapshotSaver({ rooms, store, intervalMs: 60_000 })
    await saver.flush()
    expect(saves).toEqual([['BAR:2']])
    saver.stop()
  })

  it('stops saving after stop', async () => {
    const rooms = new Map<string, GameState>([['BAR:1', createEmptyGame('BAR', 'h', '1')]])
    const { store, saves } = fakeStore()
    startRoomSnapshotSaver({ rooms, store, intervalMs: 1000 }).stop()
    await vi.advanceTimersByTimeAsync(5000)
    expect(saves).toHaveLength(0)
  })
})
