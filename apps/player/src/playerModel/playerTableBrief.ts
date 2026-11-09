import {
  displayedMainPot,
  formatTriviaNumber,
  livePotLayers,
  type GameState,
  type LiveSidePot,
  type PlayerState,
} from '@qhe/core'
import { rosterDisplayName } from './seatBettingStatus'

export type PlayerTableSeatBrief = {
  id: string
  name: string
  you: boolean
  turn: boolean
  folded: boolean
  allIn: boolean
  pointsOnly: boolean
  bankroll: number
  points: number
  sideMarks: readonly number[]
  guess: 'locked' | 'missed' | 'guessing' | null
}

function layersFor(gameState: GameState) {
  return livePotLayers(
    gameState.players.map((player) => gameState.round.handContributions?.[player.id] ?? 0),
    gameState.players.map((player) => player.hasFolded === true || player.pointsOnly === true),
    gameState.players.map((player) => player.isAllIn === true),
  )
}

function seatGuess(player: PlayerState, phase: GameState['phase']): PlayerTableSeatBrief['guess'] {
  if (phase !== 'answering') return null
  if (player.answerForfeited === true) return 'missed'
  if (player.answerLocked === true || typeof player.submittedAnswer === 'number') return 'locked'
  return 'guessing'
}

function actingIndex(gameState: GameState): number | null {
  if (gameState.phase !== 'betting' || gameState.round.isBettingOpen !== true) return null
  const index = gameState.round.currentPlayerIndex
  if (typeof index !== 'number' || index < 0) return null
  return index
}

export function playerTableSeatBriefs(gameState: GameState, myIndex: number): PlayerTableSeatBrief[] {
  const layers = layersFor(gameState)
  const acting = actingIndex(gameState)
  return gameState.players.map((player, index) => ({
    id: player.id,
    name: rosterDisplayName(player.name),
    you: index === myIndex,
    turn: index === acting,
    folded: player.hasFolded === true && player.pointsOnly !== true,
    allIn: player.isAllIn === true && player.pointsOnly !== true && player.hasFolded !== true,
    pointsOnly: player.pointsOnly === true,
    bankroll: player.bankroll,
    points: player.answerPoints ?? 0,
    sideMarks: layers.marks[index] ?? [],
    guess: seatGuess(player, gameState.phase),
  }))
}

export function playerTablePots(gameState: GameState): { pot: number; sides: readonly LiveSidePot[] } {
  return { pot: displayedMainPot(gameState), sides: layersFor(gameState).sides }
}

function myTableStatus(
  me: PlayerTableSeatBrief | undefined,
  actor: PlayerTableSeatBrief | undefined,
): string | null {
  if (me == null) return null
  if (me.turn) return 'Your turn'
  if (me.folded) return 'You folded. You can still answer for points.'
  if (me.pointsOnly) return 'Points only. This hand is for trivia points.'
  if (me.allIn && actor) return `You are all-in. ${actor.name} to act.`
  if (me.allIn) return 'You are all-in.'
  return null
}

function answeringStatus(me: PlayerTableSeatBrief | undefined): string {
  if (me?.guess === 'missed') return 'You missed the guess.'
  if (me?.guess === 'locked') return 'Your number is in.'
  return 'Build your number.'
}

function revealedAnswer(gameState: GameState): string {
  const answer = gameState.round.question?.answer
  if (typeof answer === 'number') return `The answer is ${formatTriviaNumber(answer)}.`
  return 'The answer is in.'
}

export function playerTableMoment(gameState: GameState, seats: readonly PlayerTableSeatBrief[]): string {
  if (gameState.phase === 'betting') return playerTableStatus(seats)
  if (gameState.phase === 'answering') return answeringStatus(seats.find((seat) => seat.you))
  if (gameState.phase === 'reveal' || gameState.phase === 'showdown' || gameState.phase === 'payout') {
    return revealedAnswer(gameState)
  }
  if (gameState.phase === 'question') return 'The question is up.'
  if (gameState.phase === 'intermission') return 'A short break.'
  return 'Waiting for the next hand.'
}

export function playerTableStatus(seats: readonly PlayerTableSeatBrief[]): string {
  const me = seats.find((seat) => seat.you)
  const actor = seats.find((seat) => seat.turn)
  const mine = myTableStatus(me, actor)
  if (mine) return mine
  if (actor) return `${actor.name} to act`
  return 'Waiting'
}

export function seatBriefState(seat: PlayerTableSeatBrief): string | null {
  if (seat.guess === 'locked') return 'Locked'
  if (seat.guess === 'missed') return 'No guess'
  if (seat.guess === 'guessing') return 'Guessing'
  if (seat.turn) return 'To act'
  if (seat.folded) return 'Folded'
  if (seat.allIn) return 'All-in'
  if (seat.pointsOnly) return 'Points only'
  return null
}
