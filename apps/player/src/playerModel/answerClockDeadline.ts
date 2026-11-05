import type { PlayerState, RoundState } from '@qhe/core'

function guessIsLocked(player: Pick<PlayerState, 'submittedAnswer' | 'answerLocked'> | null | undefined): boolean {
  if (player == null) return false
  if (player.answerLocked === true) return true
  return typeof player.submittedAnswer === 'number' && Number.isFinite(player.submittedAnswer)
}

/** Felt status clock. Guessing shows the shared answer window. Betting shows the turn clock. */
export function feltStatusClockDeadline(
  phase: string | undefined,
  round: { answerDeadline?: number; turnDeadlineMs?: number } | null | undefined,
): number | undefined {
  if (phase === 'answering') {
    const deadline = round?.answerDeadline
    return typeof deadline === 'number' && Number.isFinite(deadline) ? deadline : undefined
  }
  const turn = round?.turnDeadlineMs
  return typeof turn === 'number' && Number.isFinite(turn) ? turn : undefined
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
