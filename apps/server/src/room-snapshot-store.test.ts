import { describe, expect, it } from 'vitest'
import {
  createPostgresRoomSnapshotStore,
  openRoomSnapshotStoreFromEnv,
  ROOM_SNAPSHOT_SCHEMA_SQL,
  type SqlRunner,
} from './room-snapshot-store'

function fakeDb(rows: Record<string, unknown>[] = []) {
  const calls: { text: string; params?: unknown[] }[] = []
  const db: SqlRunner = {
    async query(text, params) {
      calls.push({ text, params })
      return { rows: text.startsWith('SELECT session_key') ? rows : [] }
    },
  }
  return { db, calls }
}

describe('postgres room snapshot store', () => {
  it('creates its table before the first read and only once', async () => {
    const { db, calls } = fakeDb()
    const store = createPostgresRoomSnapshotStore(db)
    await store.loadAll()
    await store.loadAll()
    expect(calls.filter((c) => c.text === ROOM_SNAPSHOT_SCHEMA_SQL)).toHaveLength(1)
    expect(calls[0]!.text).toBe(ROOM_SNAPSHOT_SCHEMA_SQL)
  })

  it('maps stored rows back to snapshot rows', async () => {
    const { db } = fakeDb([{ session_key: 'BAR:1', state_json: '{"v":1}', saved_at_ms: '1700000000000' }])
    const rows = await createPostgresRoomSnapshotStore(db).loadAll()
    expect(rows).toEqual([{ sessionKey: 'BAR:1', stateJson: '{"v":1}', savedAtMs: 1_700_000_000_000 }])
  })

  it('saves all tables in one upsert, then removes tables no longer present', async () => {
    const { db, calls } = fakeDb()
    await createPostgresRoomSnapshotStore(db).replaceAll([
      { sessionKey: 'BAR:1', stateJson: 'a' },
      { sessionKey: 'BAR:2', stateJson: 'b' },
    ])
    const upsert = calls.find((c) => c.text.includes('ON CONFLICT'))!
    expect(upsert.params).toEqual([['BAR:1', 'BAR:2'], ['a', 'b']])
    expect(upsert.text).toContain('IS DISTINCT FROM')
    const del = calls.find((c) => c.text.startsWith('DELETE'))!
    expect(del.params).toEqual([['BAR:1', 'BAR:2']])
  })

  it('clears the store when there are no tables, without an empty upsert', async () => {
    const { db, calls } = fakeDb()
    await createPostgresRoomSnapshotStore(db).replaceAll([])
    expect(calls.some((c) => c.text.includes('ON CONFLICT'))).toBe(false)
    expect(calls.find((c) => c.text.startsWith('DELETE'))!.params).toEqual([[]])
  })
})

describe('openRoomSnapshotStoreFromEnv', () => {
  it('returns no store when DATABASE_URL is missing or blank', () => {
    expect(openRoomSnapshotStoreFromEnv({})).toBeNull()
    expect(openRoomSnapshotStoreFromEnv({ DATABASE_URL: '  ' })).toBeNull()
  })
})
