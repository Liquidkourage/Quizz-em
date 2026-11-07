export type JoinAttempt = 'edit' | 'join-button'

/** A mobile keyboard submits a filled form on the first keystroke. Only Join seats the player. */
export function shouldSeatFromJoinAttempt(attempt: JoinAttempt, canJoin: boolean): boolean {
  return attempt === 'join-button' && canJoin
}

/** The typed name is a draft. Deleting the initial must not open another socket. */
export function playerSocketKey(input: { nonce: number; playerId: string; draftName: string }): string | null {
  if (input.nonce === 0) return null
  void input.draftName
  return `${input.nonce}:${input.playerId}`
}
