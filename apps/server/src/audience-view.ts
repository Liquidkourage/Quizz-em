import type { GameState, NumericCard, PlayerState, Question } from '@qhe/core'

export type StateViewer = {
  role?: string
  playerId?: string | null
}

/** Reveal advances straight into showdown. Payout is the same public hand. */
export function handSecretsArePublic(phase: string): boolean {
  return phase === 'reveal' || phase === 'showdown' || phase === 'payout'
}

function questionForAudience(question: Question): Question {
  const pub: Omit<Question, 'answer'> = {
    id: question.id,
    text: question.text,
  }
  if (question.category != null) pub.category = question.category
  if (question.difficulty != null) pub.difficulty = question.difficulty
  return pub as Question
}

function playerForAudience(player: PlayerState, mine: boolean): PlayerState {
  if (mine) return player
  const locked =
    typeof player.submittedAnswer === 'number' && Number.isFinite(player.submittedAnswer)
  const holesDealt = player.hand.length >= 2 || player.holesDealt === true
  const { submittedAnswer: _answer, answerComposition: _composition, ...rest } = player
  return {
    ...rest,
    hand: [] as NumericCard[],
    ...(holesDealt ? { holesDealt: true as const } : {}),
    ...(locked ? { answerLocked: true as const } : {}),
  }
}

/**
 * Per-socket view of a table. The host keeps the full hand (they run the desk).
 * Everyone else keeps community cards, their own hole cards, and their own guess.
 * The correct answer, other hole cards, and other guesses stay off the wire until
 * reveal / showdown / payout. Unknown roles fail closed.
 */
export function redactGameStateForViewer(gs: GameState, viewer: StateViewer): GameState {
  if (viewer.role === 'host') return gs
  if (handSecretsArePublic(gs.phase)) return gs
  const question = gs.round.question
  const players = gs.players.map((player) =>
    playerForAudience(
      player,
      viewer.role === 'player' && viewer.playerId != null && player.id === viewer.playerId,
    ),
  )
  return {
    ...gs,
    players,
    round: {
      ...gs.round,
      question: question ? questionForAudience(question) : null,
    },
  }
}
