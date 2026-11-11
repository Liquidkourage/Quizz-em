import { shownTriviaNumber } from '@qhe/core'

/**
 * What the composer shows as a locked guess.
 * The server value covers a reload and an all-in preload (phase still betting).
 * Optimistic text covers the moment before that state arrives.
 * Editing unlocks the keypad even though the previous guess is still stored.
 */
export function lockedAnswerDisplayText(opts: {
  editing: boolean
  serverAnswer: number | null | undefined
  optimistic: string | null
  question?: { text?: string | null; category?: string | null } | null
}): string | null {
  if (opts.editing) return null
  if (opts.optimistic) return opts.optimistic
  if (typeof opts.serverAnswer === 'number' && Number.isFinite(opts.serverAnswer)) {
    return shownTriviaNumber(opts.serverAnswer, opts.question)
  }
  return null
}

/**
 * A phone can still say Submitted after a restart restored the table without that guess.
 * Keep the label until a newer table state arrives, then trust the server.
 */
export function optimisticGuessStillShown(opts: {
  optimistic: string | null
  serverAnswer: number | null | undefined
  stateEpoch: number
  optimisticEpoch: number
}): boolean {
  if (!opts.optimistic) return false
  if (typeof opts.serverAnswer === 'number' && Number.isFinite(opts.serverAnswer)) return true
  return opts.stateEpoch <= opts.optimisticEpoch
}
