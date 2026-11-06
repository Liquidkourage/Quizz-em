import {
  closestComposedAnswer,
  determineChipPotTriviaWinners,
  formatTriviaNumber,
  guessMatchesBestHand,
  previewChipPayoutByPlayerId,
  type GamePhase,
  type GameState,
} from '@qhe/core'
import { isHandStartingPhase, isPostHandPhase, triviaPointsForAnswer } from './handSummary'

export type TableResultRow = {
  playerId: string
  name: string
  isYou: boolean
  folded: boolean
  pointsOnly: boolean
  submitted: number | null
  formattedAnswer: string
  /** Absolute miss from the correct answer. Null when no guess was locked. */
  off: number | null
  formattedOff: string
  /** Stack after this hand’s pot share (bankroll + chipPayout while previewing). */
  stack: number
  /** Chips returned from the pot this hand (gross). */
  chipPayout: number
  /** Net chip gain/loss for the hand: payout − contribution. */
  chipChange: number
  isPotWinner: boolean
  /** Trivia points this hand (0 if folded / no answer). */
  triviaPoints: number
}

export type TableResults = {
  correctAnswer: number
  formattedCorrect: string
  winnerIds: string[]
  winnerNames: string[]
  /** Your trivia points this hand when `myPlayerId` is known. */
  yourTriviaPoints: number | null
  /** Closest number your seven cards could make. Null without a locked guess or a full deal. */
  yourBestHand: string | null
  yourBestHandPlayed: boolean
  rows: TableResultRow[]
}

/** Chip seats on the hand you are still in. Points-only passengers show up once that is you. */
function resultsRoster<T extends { id: string; pointsOnly?: boolean }>(
  players: readonly T[],
  myPlayerId: string | null | undefined,
): T[] {
  const you = myPlayerId ? players.find((p) => p.id === myPlayerId) : undefined
  if (you?.pointsOnly === true) return [...players]
  return players.filter((p) => p.pointsOnly !== true)
}

function guessOff(submitted: number | null, correct: number): number | null {
  if (submitted == null) return null
  return Math.abs(submitted - correct)
}

function formatOff(off: number | null): string {
  if (off == null) return '—'
  return formatTriviaNumber(off)
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

  const rows: TableResultRow[] = resultsRoster(gameState.players, myPlayerId).map((p) => {
    const folded = p.hasFolded
    const pointsOnly = p.pointsOnly === true
    const submitted = typeof p.submittedAnswer === 'number' ? p.submittedAnswer : null
    let formattedAnswer = '—'
    if (submitted != null) formattedAnswer = formatTriviaNumber(submitted)
    else if (folded) formattedAnswer = 'Folded'
    else if (pointsOnly) formattedAnswer = 'Points only'

    const off = guessOff(submitted, q.answer)
    const chipPayout = Math.max(0, Math.round(payoutById[p.id] ?? 0))
    const contributed = Math.max(0, Math.round(contributions[p.id] ?? 0))
    const chipChange = pointsOnly ? 0 : chipPayout - contributed
    const bankroll = Math.max(0, Math.round(p.bankroll))
    const triviaPoints = triviaPointsForAnswer(submitted ?? undefined, q.answer)
    return {
      playerId: p.id,
      name: p.name.trim() || p.id,
      isYou: Boolean(myPlayerId) && p.id === myPlayerId,
      folded,
      pointsOnly,
      submitted,
      formattedAnswer,
      off,
      formattedOff: formatOff(off),
      stack: bankroll + chipPayout,
      chipPayout,
      chipChange,
      isPotWinner: winnerIdSet.has(p.id) && chipPayout > 0,
      triviaPoints,
    }
  })

  // If preview returned $0 for everyone (edge), still mark trivia pot winners.
  if (rows.every((r) => r.chipPayout === 0) && winnerIdSet.size > 0) {
    for (const row of rows) {
      if (winnerIdSet.has(row.playerId)) row.isPotWinner = true
    }
  }

  const you = rows.find((r) => r.isYou)
  const best = bestHandForYou(gameState, myPlayerId, q.answer)

  return {
    correctAnswer: q.answer,
    formattedCorrect: formatTriviaNumber(q.answer),
    winnerIds,
    winnerNames,
    yourTriviaPoints: you ? you.triviaPoints : null,
    yourBestHand: best?.formatted ?? null,
    yourBestHandPlayed: best?.played ?? false,
    rows,
  }
}

function bestHandForYou(
  gameState: GameState,
  myPlayerId: string | null | undefined,
  correct: number,
): { formatted: string; played: boolean } | null {
  if (!myPlayerId) return null
  const you = gameState.players.find((p) => p.id === myPlayerId)
  const submitted = you?.submittedAnswer
  const community = gameState.round.communityCards ?? []
  if (!you || typeof submitted !== 'number' || you.hand.length !== 2 || community.length !== 5) return null
  const best = closestComposedAnswer(
    [...you.hand, ...community].map((card) => card.digit),
    correct,
  )
  if (best == null) return null
  return {
    formatted: formatTriviaNumber(best),
    played: guessMatchesBestHand(submitted, best, correct),
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

export type TableResultSortKey = 'name' | 'answer' | 'off' | 'points' | 'stack' | 'change'
export type TableResultSortDir = 'asc' | 'desc'
export type TableResultSort = { key: TableResultSortKey; dir: TableResultSortDir }

export function nextTableResultSort(current: TableResultSort, key: TableResultSortKey): TableResultSort {
  if (current.key !== key) return { key, dir: 'asc' }
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
}

function compareMissingLast(a: number | null, b: number | null, sign: number): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return (a - b) * sign
}

function sortNumber(row: TableResultRow, key: TableResultSortKey): number | null {
  if (key === 'answer') return row.submitted
  if (key === 'off') return row.off
  if (key === 'points') return row.triviaPoints
  if (key === 'stack') return row.stack
  return row.chipChange
}

function compareTableResultRows(
  a: TableResultRow,
  b: TableResultRow,
  key: TableResultSortKey,
  sign: number,
): number {
  if (key === 'name') return a.name.localeCompare(b.name) * sign
  return compareMissingLast(sortNumber(a, key), sortNumber(b, key), sign)
}

export function sortTableResultRows(
  rows: readonly TableResultRow[],
  key: TableResultSortKey,
  dir: TableResultSortDir,
): TableResultRow[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => compareTableResultRows(left, right, key, sign))
}

export function formatWinnerLine(results: TableResults): string {
  if (results.winnerNames.length === 0) return 'No pot winner'
  if (results.winnerNames.length === 1) return `Pot: ${results.winnerNames[0]}`
  if (results.winnerNames.length === 2) {
    return `Split: ${results.winnerNames[0]} & ${results.winnerNames[1]}`
  }
  return `Split: ${results.winnerNames.join(', ')}`
}
