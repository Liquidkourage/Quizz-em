import type { GamePhase, GameState, PlayerState } from '@qhe/core'
import { formatTriviaNumber } from '@qhe/core'

export type HandBaseline = {
  bankroll: number
  answerPoints: number
}

export type HandSummary = {
  stackDelta: number
  pointsGained: number
  submittedAnswer: number | null
  correctAnswer: number | null
  triviaPointsThisHand: number
  formattedSubmitted: string | null
  formattedCorrect: string | null
}

const HAND_START_PHASES = new Set<GamePhase>(['question', 'betting'])
const POST_HAND_PHASES = new Set<GamePhase>(['reveal', 'showdown', 'payout'])

export function isHandStartingPhase(phase: GamePhase): boolean {
  return HAND_START_PHASES.has(phase)
}

export function isPostHandPhase(phase: GamePhase): boolean {
  return POST_HAND_PHASES.has(phase)
}

export function captureHandBaseline(player: PlayerState | undefined): HandBaseline | null {
  if (!player) return null
  return {
    bankroll: player.bankroll,
    answerPoints: player.answerPoints ?? 0,
  }
}

export function triviaPointsForAnswer(
  submitted: number | undefined,
  correct: number,
  folded: boolean
): number {
  if (folded || submitted === undefined) return 0
  const distance = Math.abs(submitted - correct)
  return Math.max(0, 100 - Math.min(distance, 100))
}

export function buildHandSummary(args: {
  baseline: HandBaseline
  player: PlayerState
  questionAnswer: number | null
  foldedDuringHand: boolean
}): HandSummary {
  const { baseline, player, questionAnswer, foldedDuringHand } = args
  const submitted = player.submittedAnswer
  const correct = questionAnswer
  const triviaPointsThisHand =
    correct != null ? triviaPointsForAnswer(submitted, correct, foldedDuringHand) : 0

  return {
    stackDelta: player.bankroll - baseline.bankroll,
    pointsGained: (player.answerPoints ?? 0) - baseline.answerPoints,
    submittedAnswer: typeof submitted === 'number' ? submitted : null,
    correctAnswer: correct,
    triviaPointsThisHand,
    formattedSubmitted:
      typeof submitted === 'number' ? formatTriviaNumber(submitted) : null,
    formattedCorrect: correct != null ? formatTriviaNumber(correct) : null,
  }
}

export function shouldLatchHandSummary(prevPhase: GamePhase, nextPhase: GamePhase): boolean {
  return isPostHandPhase(prevPhase) && nextPhase === 'lobby'
}

export function questionAnswerFromState(gameState: GameState): number | null {
  const a = gameState.round.question?.answer
  return typeof a === 'number' && Number.isFinite(a) ? a : null
}
