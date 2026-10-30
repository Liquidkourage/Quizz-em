import { formatTriviaNumber } from '@qhe/core'

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
}): string | null {
  if (opts.editing) return null
  if (opts.optimistic) return opts.optimistic
  if (typeof opts.serverAnswer === 'number' && Number.isFinite(opts.serverAnswer)) {
    return formatTriviaNumber(opts.serverAnswer)
  }
  return null
}
