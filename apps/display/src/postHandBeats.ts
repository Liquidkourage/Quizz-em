/** Produced TV beats after End Round before the auto leaderboard latch. */
export const POST_HAND_PAYOUT_MS = 10_000
export const POST_HAND_INTERMISSION_MS = 8_000
export const POST_HAND_TOTAL_MS = POST_HAND_PAYOUT_MS + POST_HAND_INTERMISSION_MS

export type PostHandBeatKind = 'payout' | 'intermission' | null

/**
 * Which produced beat is live for a given `postHandBeatStartedAtMs` (server epoch)
 * and client-aligned `nowMs`.
 */
export function resolvePostHandBeat(
  startedAtMs: number | null | undefined,
  nowMs: number,
): PostHandBeatKind {
  if (startedAtMs == null || !Number.isFinite(startedAtMs)) return null
  const elapsed = nowMs - startedAtMs
  if (elapsed < 0 || elapsed >= POST_HAND_TOTAL_MS) return null
  if (elapsed < POST_HAND_PAYOUT_MS) return 'payout'
  return 'intermission'
}

/** True while payout/intermission should block the auto leaderboard latch. */
export function postHandBeatsActive(
  startedAtMs: number | null | undefined,
  nowMs: number,
): boolean {
  return resolvePostHandBeat(startedAtMs, nowMs) != null
}
