/** Whole seconds left on an answer deadline, rounded up, never below zero. */
export function answerSecondsRemaining(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))
}
