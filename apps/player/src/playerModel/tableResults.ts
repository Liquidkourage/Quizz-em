import {
  determineChipPotTriviaWinners,
  formatTriviaNumber,
  previewChipPayoutByPlayerId,
  type GamePhase,
  type GameState,
} from '@qhe/core'
import { isHandStartingPhase, isPostHandPhase } from './handSummary'

export type TableResultRow = {
  playerId: string
  name: string
  isYou: boolean
  folded: boolean
  pointsOnly: boolean
  submitted: number | null
  formattedAnswer: string
  /** Stack after this hand’s pot share (bankroll + chipPayout while previewing). */
  stack: number
  /** Chips returned from the pot this hand (gross). */
  chipPayout: number
  /** Net chip gain/loss for the hand: payout − contribution. */
  chipChange: number
  isPotWinner: boolean
}

export type TableResults = {
  correctAnswer: number
  formattedCorrect: string
  winnerIds: string[]
  winnerNames: string[]
  rows: TableResultRow[]
}

/** Coerce legacy `payout` into a phase previewChipPayout accepts. */
function stateForPayoutPreview(gameState: GameState): GameState {
  if (gameState.phase === 'showdown' || gameState.phase === 'reveal') return gameState
  if (gameState.phase === 'payout') return { ...gameState, phase: 'showdown' }
  return gameState
}

export function buildTableResults(
  gameState: GameState,
  myPlayerId: string | null | undefined,
): TableResults | null {
  const q = gameState.round.question
  if (!q || !isPostHandPhase(gameState.phase)) return null
  if (gameState.players.length === 0) return null

  const payoutById = previewChipPayoutByPlayerId(stateForPayoutPreview(gameState))
  const contributions = gameState.round.handContributions ?? {}
  const potWinners = determineChipPotTriviaWinners(gameState)
  const winnerIds = potWinners?.winnerIds ?? []
  const winnerIdSet = new Set(winnerIds)
  const winnerNames = winnerIds
    .map((id) => gameState.players.find((p) => p.id === id)?.name?.trim())
    .filter((n): n is string => Boolean(n))

  const rows: TableResultRow[] = gameState.players.map((p) => {
    const folded = p.hasFolded
    const pointsOnly = p.pointsOnly === true
    const submitted = typeof p.submittedAnswer === 'number' ? p.submittedAnswer : null
    let formattedAnswer = '—'
    if (folded) formattedAnswer = 'Folded'
    else if (pointsOnly && submitted == null) formattedAnswer = 'Points only'
    else if (submitted != null) formattedAnswer = formatTriviaNumber(submitted)

    const chipPayout = Math.max(0, Math.round(payoutById[p.id] ?? 0))
    const contributed = Math.max(0, Math.round(contributions[p.id] ?? 0))
    const chipChange = pointsOnly ? 0 : chipPayout - contributed
    const bankroll = Math.max(0, Math.round(p.bankroll))
    return {
      playerId: p.id,
      name: p.name.trim() || p.id,
      isYou: Boolean(myPlayerId) && p.id === myPlayerId,
      folded,
      pointsOnly,
      submitted,
      formattedAnswer,
      stack: bankroll + chipPayout,
      chipPayout,
      chipChange,
      isPotWinner: winnerIdSet.has(p.id) && chipPayout > 0,
    }
  })

  // If preview returned $0 for everyone (edge), still mark trivia pot winners.
  if (rows.every((r) => r.chipPayout === 0) && winnerIdSet.size > 0) {
    for (const row of rows) {
      if (winnerIdSet.has(row.playerId)) row.isPotWinner = true
    }
  }

  return {
    correctAnswer: q.answer,
    formattedCorrect: formatTriviaNumber(q.answer),
    winnerIds,
    winnerNames,
    rows,
  }
}

export function shouldClearTableResults(prevPhase: GamePhase | null, nextPhase: GamePhase): boolean {
  if (prevPhase === 'lobby' && isHandStartingPhase(nextPhase)) return true
  if (prevPhase != null && isHandStartingPhase(nextPhase) && prevPhase !== nextPhase) return true
  return false
}

/** @deprecated Prefer {@link formatChipChange}. */
export function formatPotWin(amount: number): string {
  if (amount <= 0) return '—'
  return `+$${amount.toLocaleString()}`
}

export function formatChipChange(amount: number): string {
  const n = Math.round(amount)
  if (n === 0) return '—'
  const abs = Math.abs(n).toLocaleString()
  return n > 0 ? `+$${abs}` : `-$${abs}`
}

export function formatStack(amount: number): string {
  return `$${Math.max(0, Math.round(amount)).toLocaleString()}`
}

export function formatWinnerLine(results: TableResults): string {
  if (results.winnerNames.length === 0) return 'No pot winner'
  if (results.winnerNames.length === 1) return `Pot: ${results.winnerNames[0]}`
  if (results.winnerNames.length === 2) {
    return `Split: ${results.winnerNames[0]} & ${results.winnerNames[1]}`
  }
  return `Split: ${results.winnerNames.join(', ')}`
}
