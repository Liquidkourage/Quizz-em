/** The answer card covers the floor. Payout waits for that one card, then the mosaic is the winner view. */
export const ANSWER_REVEAL_BEFORE_WINNERS_MS = 7_000

/** Epoch ms when payout is allowed. Zero tables means there is nothing to wait for. */
export function winnerScreensReadyAt(startedAtMs: number, tableCount: number): number {
  const tables = Math.max(0, Math.floor(tableCount))
  if (tables === 0) return startedAtMs
  return startedAtMs + ANSWER_REVEAL_BEFORE_WINNERS_MS
}

/** Why Pay winners is held, or null once every winner screen has been shown. */
export function winnerScreensPayoutHint(
  readyAtMs: number | null | undefined,
  nowMs: number,
): string | null {
  if (readyAtMs == null || !(nowMs < readyAtMs)) return null
  const sec = Math.max(1, Math.ceil((readyAtMs - nowMs) / 1000))
  return `The answer is still on the screens. ${sec}s`
}
