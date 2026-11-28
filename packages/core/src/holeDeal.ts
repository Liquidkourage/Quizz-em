/** Wait this long after the question is on the tables, then deal the hole cards. */
export const HOLE_DEAL_DELAY_MS = 10_000

/** `host` waits for the Deal button. `auto` deals 10 seconds after the question. */
export type HoleDeal = 'host' | 'auto'

/** Missing or unknown means the host still deals the hole cards. */
export function holeDealFrom(raw: unknown): HoleDeal {
  return raw === 'auto' ? 'auto' : 'host'
}
