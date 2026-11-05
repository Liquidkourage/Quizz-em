import type { PlayerState, RoundState } from '@qhe/core'

function guessIsLocked(player: Pick<PlayerState, 'submittedAnswer' | 'answerLocked'> | null | undefined): boolean {
  if (player == null) return false
  if (player.answerLocked === true) return true
  return typeof player.submittedAnswer === 'number' && Number.isFinite(player.submittedAnswer)
}

/**
 * Countdown a phone should show.
 * A nudge clock is for seats that have not locked a guess.
 */
export function answerClockDeadline(
  round: Pick<RoundState, 'answerDeadline' | 'guessNudge'> | null | undefined,
  player: Pick<PlayerState, 'submittedAnswer' | 'answerLocked'> | null | undefined,
): number | undefined {
  if (round == null) return undefined
  if (round.guessNudge === true && guessIsLocked(player)) return undefined
  return round.answerDeadline
}
