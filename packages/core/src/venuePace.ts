export type VenuePace = 'sync' | 'async'

/** Missing or unknown means the room still moves together. */
export function venuePaceFrom(raw: unknown): VenuePace {
  return raw === 'async' ? 'async' : 'sync'
}
