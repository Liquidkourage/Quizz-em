import { Pool } from 'pg'
import type { RoomSnapshotRow } from './room-snapshot'

/** Where saved tables live between server restarts. */
export interface RoomSnapshotStore {
  loadAll(): Promise<RoomSnapshotRow[]>
  /** Make the store hold exactly these tables: add or update each one, drop the rest. */
  replaceAll(rows: readonly RoomSnapshotRow[]): Promise<void>
}

/** The only part of a pg Pool the store needs, so tests can stand in for it. */
export interface SqlRunner {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

export const ROOM_SNAPSHOT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS room_snapshots (
  session_key TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`

const UPSERT_SQL = `
INSERT INTO room_snapshots (session_key, state_json, saved_at)
SELECT k, s, now() FROM unnest($1::text[], $2::text[]) AS t(k, s)
ON CONFLICT (session_key) DO UPDATE SET state_json = EXCLUDED.state_json, saved_at = EXCLUDED.saved_at`

export function createPostgresRoomSnapshotStore(db: SqlRunner): RoomSnapshotStore {
  let schemaReady: Promise<unknown> | null = null
  const ready = () => (schemaReady ??= db.query(ROOM_SNAPSHOT_SCHEMA_SQL))

  return {
    async loadAll() {
      await ready()
      const { rows } = await db.query('SELECT session_key, state_json FROM room_snapshots ORDER BY session_key')
      return rows.map((r) => ({ sessionKey: String(r.session_key), stateJson: String(r.state_json) }))
    },
    async replaceAll(rows) {
      await ready()
      if (rows.length > 0) {
        await db.query(UPSERT_SQL, [rows.map((r) => r.sessionKey), rows.map((r) => r.stateJson)])
      }
      await db.query('DELETE FROM room_snapshots WHERE session_key <> ALL($1::text[])', [rows.map((r) => r.sessionKey)])
    },
  }
}

/** Postgres when DATABASE_URL is set; otherwise null and the server runs without recovery. */
export function openRoomSnapshotStoreFromEnv(env: NodeJS.ProcessEnv = process.env): RoomSnapshotStore | null {
  const url = env.DATABASE_URL?.trim()
  if (!url) return null
  const local =
    env.PGSSLMODE === 'disable' ||
    /\bsslmode=disable\b/i.test(url) ||
    /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url)
  const pool = new Pool({
    connectionString: url,
    max: 2,
    idleTimeoutMillis: 30_000,
    ssl: local ? undefined : { rejectUnauthorized: false },
  })
  return createPostgresRoomSnapshotStore(pool as unknown as SqlRunner)
}
