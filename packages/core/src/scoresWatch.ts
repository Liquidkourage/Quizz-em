/** Hands in a row without chip scores or trivia scores before the next question waits. */
export const SCORES_FORCE_AFTER_HANDS = 5

export type ScoresWatch = {
  /** A question is on the tables and the next one has not replaced it. */
  cycleOpen: boolean
  shownThisCycle: boolean
  missedHands: number
}

export function emptyScoresWatch(): ScoresWatch {
  return { cycleOpen: false, shownThisCycle: false, missedHands: 0 }
}

export function noteScoresView(watch: ScoresWatch, wallView: string): ScoresWatch {
  if (wallView !== 'leaderboard' && wallView !== 'leaderboard-trivia') return watch
  if (watch.shownThisCycle) return watch
  return { ...watch, shownThisCycle: true }
}

function pendingMissedHands(watch: ScoresWatch): number {
  if (!watch.cycleOpen || watch.shownThisCycle) return watch.missedHands
  return watch.missedHands + 1
}

export function scoresCue(watch: ScoresWatch): { hint: string | null; blocked: boolean } {
  if (!watch.cycleOpen || watch.shownThisCycle) return { hint: null, blocked: false }
  const pending = pendingMissedHands(watch)
  if (pending >= SCORES_FORCE_AFTER_HANDS) {
    return { hint: 'Show chip scores or trivia scores before the next hand.', blocked: true }
  }
  if (pending === 1) {
    return { hint: 'Chip scores or trivia scores have not been up.', blocked: false }
  }
  return { hint: `${pending} hands without chip or trivia scores.`, blocked: false }
}

/** Count the hand that just finished, then open a fresh cycle. */
export function advanceScoresWatch(watch: ScoresWatch): ScoresWatch {
  const missedHands = !watch.cycleOpen
    ? watch.missedHands
    : watch.shownThisCycle
      ? 0
      : watch.missedHands + 1
  return { cycleOpen: true, shownThisCycle: false, missedHands }
}
