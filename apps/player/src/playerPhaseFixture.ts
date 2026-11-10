import {
  LOBBY_TABLE_ID,
  createEmptyGame,
  type GameState,
  type NumericCard,
  type PlayerPhasePreviewId,
  type PlayerState,
} from '@qhe/core'

export const PREVIEW_YOU_ID = 'preview-you'
export const PREVIEW_QUESTION = 'How many minutes are there in a day?'

const NAMES = ['Ada A', 'Bo B', 'Cara C', 'Dee D', 'Eve E', 'Fay F', 'Gus G', 'You Y'] as const

const ANSWERS = [1440, 1400, 1600, null, 1442, 2000, 1441, 1500] as const

function card(digit: NumericCard['digit']): NumericCard {
  return { digit }
}

function seat(name: string, index: number, answer: number | null): PlayerState {
  const you = name === 'You Y'
  return {
    id: you ? PREVIEW_YOU_ID : `preview-${index}`,
    name,
    bankroll: 1000,
    hand: you ? [card(1), card(4)] : [],
    holesDealt: true,
    hasFolded: answer == null,
    isAllIn: false,
    answerPoints: 0,
    pointsOnly: false,
    ...(answer == null ? {} : { submittedAnswer: answer }),
  }
}

function roster(withAnswers: boolean): PlayerState[] {
  return NAMES.map((name, index) => seat(name, index, withAnswers ? ANSWERS[index]! : null))
}

function hand(phase: GameState['phase'], tableId: string, withAnswers: boolean): GameState {
  const game = createEmptyGame('QUIZ', 'host', tableId)
  return {
    ...game,
    phase,
    players: roster(withAnswers).map((player) =>
      withAnswers ? player : { ...player, hasFolded: false, submittedAnswer: undefined },
    ),
    round: {
      ...game.round,
      pot: withAnswers ? 160 : 30,
      question: withAnswers || phase !== 'lobby' ? { id: 'minutes', text: PREVIEW_QUESTION, answer: 1440 } : null,
      communityCards: withAnswers ? [card(2), card(0), card(2), card(6), card(9)] : [],
      handContributions: withAnswers
        ? Object.fromEntries(roster(true).map((player) => [player.id, 20]))
        : {},
    },
  }
}

function yourTurn(): GameState {
  const game = hand('betting', '1', false)
  const you = game.players.findIndex((player) => player.id === PREVIEW_YOU_ID)
  return {
    ...game,
    round: {
      ...game.round,
      question: { id: 'minutes', text: PREVIEW_QUESTION, answer: 1440 },
      isBettingOpen: true,
      currentBet: 40,
      currentPlayerIndex: you,
      lastFullRaiseAmount: 20,
      playerBets: { [PREVIEW_YOU_ID]: 20 },
      bettingRound: 1,
    },
  }
}

function folded(): GameState {
  const game = hand('question', '1', false)
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === PREVIEW_YOU_ID ? { ...player, hasFolded: true } : player,
    ),
    round: {
      ...game.round,
      communityCards: [card(2), card(0), card(2), card(6), card(9)],
    },
  }
}

function guessing(locked: boolean): GameState {
  const game = hand('answering', '1', false)
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === PREVIEW_YOU_ID && locked ? { ...player, submittedAnswer: 1500 } : player,
    ),
    round: {
      ...game.round,
      communityCards: [card(2), card(0), card(2), card(6), card(9)],
    },
  }
}

const PHASE_GAMES: Record<PlayerPhasePreviewId, () => GameState | null> = {
  join: () => null,
  connecting: () => null,
  'game-over': () => null,
  waiting: () => hand('lobby', LOBBY_TABLE_ID, false),
  table: () => hand('lobby', '1', false),
  question: () => hand('question', '1', false),
  turn: yourTurn,
  guess: () => guessing(false),
  'guess-locked': () => guessing(true),
  folded,
  results: () => hand('reveal', '1', true),
  between: () => hand('reveal', '1', true),
}

/** Picture of one phone. Join, connecting, and game over do not need a felt. */
export function playerPhaseGame(scene: PlayerPhasePreviewId): GameState | null {
  return PHASE_GAMES[scene]()
}
