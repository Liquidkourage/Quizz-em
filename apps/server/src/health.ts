export type HealthReport = {
  status: 'ok'
  uptimeSec: number
  memoryMb: number
  rooms: number
  venues: number
  players: number
  persistence: 'postgres' | 'sqlite'
  node: string
}

type RoomLike = { code: string; players: readonly unknown[] }

/**
 * Summary for monitoring. Counts only: it never includes venue codes, room keys, player
 * names or the database URL, because the endpoint is public.
 */
export function buildHealthReport(input: {
  rooms: ReadonlyMap<string, RoomLike>
  uptimeMs: number
  rssBytes: number
  nodeVersion: string
  databaseUrl?: string
}): HealthReport {
  const venues = new Set<string>()
  let players = 0
  for (const room of input.rooms.values()) {
    venues.add(room.code)
    players += room.players.length
  }
  return {
    status: 'ok',
    uptimeSec: Math.floor(input.uptimeMs / 1000),
    memoryMb: Math.round(input.rssBytes / (1024 * 1024)),
    rooms: input.rooms.size,
    venues: venues.size,
    players,
    persistence: input.databaseUrl?.trim() ? 'postgres' : 'sqlite',
    node: input.nodeVersion,
  }
}
