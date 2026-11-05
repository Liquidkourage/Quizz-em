import type { PlayerState, RoundState } from '@qhe/core'

function guessIsLocked(player: Pick<PlayerState, 'submittedAnswer' | 'answerLocked'> | null | undefined): boolean {
  if (player == null) return false
  if (player.answerLocked === true) return true
  return typeof player.submittedAnswer === 'number' && Number.isFinite(player.submittedAnswer)
}

/** Shared answer window. A locked guess can still be edited until this deadline. */
export function answerClockDeadline(
  round: Pick<RoundState, 'answerDeadline'> | null | undefined,
): number | undefined {
  return round?.answerDeadline
}

/** Host nudge. Only a seat that has not locked a guess sees this countdown. */
export function nudgeClockDeadline(
  round: Pick<RoundState, 'guessNudge' | 'guessNudgeDeadline'> | null | undefined,
  player: Pick<PlayerState, 'submittedAnswer' | 'answerLocked'> | null | undefined,
): number | undefined {
  if (round?.guessNudge !== true) return undefined
  if (guessIsLocked(player)) return undefined
  const deadline = round.guessNudgeDeadline
  if (typeof deadline !== 'number' || !Number.isFinite(deadline)) return undefined
  return deadline
}
