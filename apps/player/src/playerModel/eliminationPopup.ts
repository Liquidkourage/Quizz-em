/** One-player TV bust dwell. The phone uses the same hold after payout. */
export const ELIMINATION_POPUP_MS = 6500

export type EliminationWatch = {
  pointsOnly: boolean
  roundId: string
}

/**
 * Hand key for the bust callout, or null.
 * Opens only when this seat first becomes points-only as the hand pays out.
 * The first snapshot is a reconnect, not a new bust.
 */
export function eliminationPopupHandKey(
  previous: EliminationWatch | null,
  next: { pointsOnly: boolean; phase: string; roundId: string },
): string | null {
  if (previous == null || previous.pointsOnly || !next.pointsOnly) return null
  if (next.phase !== 'lobby' && next.phase !== 'payout') return null
  return next.roundId
}
