export type JoinAttempt = 'edit' | 'join-button'

/** A mobile keyboard submits a filled form on the first keystroke. Only Join seats the player. */
export function shouldSeatFromJoinAttempt(attempt: JoinAttempt, canJoin: boolean): boolean {
  return attempt === 'join-button' && canJoin
}
