import { displayedMainPot, livePotLayers, type GameState, type LiveSidePot } from '@qhe/core'
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
}

function layersFor(gameState: GameState) {
  return livePotLayers(
    gameState.players.map((player) => gameState.round.handContributions?.[player.id] ?? 0),
    gameState.players.map((player) => player.hasFolded === true || player.pointsOnly === true),
    gameState.players.map((player) => player.isAllIn === true),
  )
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

export function playerTableStatus(seats: readonly PlayerTableSeatBrief[]): string {
  const me = seats.find((seat) => seat.you)
  const actor = seats.find((seat) => seat.turn)
  const mine = myTableStatus(me, actor)
  if (mine) return mine
  if (actor) return `${actor.name} to act`
  return 'Waiting'
}

export function seatBriefState(seat: PlayerTableSeatBrief): string | null {
  if (seat.turn) return 'To act'
  if (seat.folded) return 'Folded'
  if (seat.allIn) return 'All-in'
  if (seat.pointsOnly) return 'Points only'
  return null
}
