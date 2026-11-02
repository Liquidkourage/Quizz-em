import { randomBytes } from 'crypto'
import {
  addPlayer,
  removePlayer,
  composeNumericAnswersFromSevenDigitCards,
  inferAnswerComposition,
  nearlyEqualNumbers,
  submitAnswer,
  foldPlayer,
  playerCheck,
  forcedTurnAction,
  playerCall,
  playerRaise,
  playerAllIn,
  nearestLegalAnswerToTarget,
  releasePlayer,
  rehearsalSeatDisplayName,
  normalizeBettingTurn,
  inChipContest,
  type GameState,
  type PlayerState,
} from '@qhe/core'

/** Synthetic seats — never collide with Socket.IO ids. */
const VP_PREFIX = 'vp:'

export function isVirtualPlayerId(id: string): boolean {
  return id.startsWith(VP_PREFIX)
}

export function generateVirtualSeatId(): string {
  return `${VP_PREFIX}${randomBytes(10).toString('hex')}`
}

export function liveVirtualCount(state: GameState): number {
  return state.players.filter(p => isVirtualPlayerId(p.id)).length
}

const guessNudgeIds = new Set<string>()

/** Next answering step locks a closest legal guess for this rehearsal seat. */
export function noteGuessNudge(playerId: string): void {
  if (isVirtualPlayerId(playerId)) guessNudgeIds.add(playerId)
}

function takeNudgedGuess(state: GameState): GameState | null {
  for (const player of state.players) {
    if (!guessNudgeIds.has(player.id)) continue
    guessNudgeIds.delete(player.id)
    if (!isVirtualPlayerId(player.id) || player.hand.length !== 2) continue
    if (typeof player.submittedAnswer === 'number' || player.answerForfeited === true) continue
    if (state.round.question == null) continue
    const values = legalAnswers(sevenDigits(player, state))
    if (values.length === 0) continue
    return lockGuess(
      state,
      player,
      nearestLegalAnswerToTarget(sevenDigits(player, state), state.round.question.answer),
    )
  }
  return null
}

export function addVirtualPlayers(state: GameState, requested: number): GameState {
  const room = Math.max(0, state.maxPlayers - state.players.length)
  if (room <= 0) return state
  const want = Math.floor(Number(requested) || 1)
  const n = Math.max(1, Math.min(room, want))
  let s = state
  for (let i = 0; i < n; i++) {
    const id = generateVirtualSeatId()
    const slot = liveVirtualCount(s)
    s = addPlayer(s, id, rehearsalSeatDisplayName(slot))
  }
  return s
}

/** Remove every virtual seat in one shot (host tooling). */
export function removeAllVirtualPlayers(state: GameState): GameState {
  let s = state
  const toDrop = s.players.filter(p => isVirtualPlayerId(p.id))
  for (const p of toDrop) {
    s = removePlayer(s, p.id)
  }
  return s
}

/** Venue / demo fill: roster is exclusively `vp:*` seats — safe to auto-run wagering between snapshots. */
export function tableIsCpuOnly(state: GameState): boolean {
  return state.players.length > 0 && state.players.every((p) => isVirtualPlayerId(p.id))
}

function vpAmountToCall(state: GameState, playerId: string): number {
  const cur = state.round.currentBet || 0
  const contrib = state.round.playerBets?.[playerId] || 0
  return Math.max(0, cur - contrib)
}

/** No wager on the street yet (`currentBet === 0`), e.g. fresh post-board round 2. */
function chipStreetUnopened(state: GameState): boolean {
  return (state.round.currentBet || 0) === 0
}

function anyActiveSeatActedThisStreet(state: GameState): boolean {
  const last = state.round.lastSeatBettingAction ?? []
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i]
    if (!p || p.hasFolded || p.isAllIn || !inChipContest(p)) continue
    if (last[i] != null) return true
  }
  return false
}

/** Human-like wagering: occasional open/raising, rarely fold useless, sometimes jam. */
function actVirtualBetting(state: GameState, pid: string): GameState {
  const seat = state.players.find((p) => p.id === pid)
  if (!seat) return state

  const toCall = vpAmountToCall(state, pid)
  const br = seat.bankroll
  const bbRaw = Math.max(state.bigBlind ?? 0, state.smallBlind ?? 0)
  const bb = bbRaw > 0 ? bbRaw : 10

  if (Math.random() < 0.03 && br > 0) {
    const ai = playerAllIn(state, pid)
    if (ai !== state) return ai
  }

  if (toCall === 0 && br > 0) {
    // Can check — sometimes open with a min-raise (no blind seed on post-board streets).
    const postBoard = (state.round.bettingRound ?? 0) >= 2
    const unopened = chipStreetUnopened(state)
    let openChance = 0.16
    if (unopened && postBoard) {
      openChance = 0.45
    } else if (unopened && !anyActiveSeatActedThisStreet(state)) {
      openChance = 0.28
    }
    if (Math.random() < openChance && br >= bb) {
      const raised = playerRaise(state, pid, bb)
      if (raised !== state) return raised
    }
    return playerCheck(state, pid)
  }

  if (toCall > 0 && br === 0) {
    return state
  }

  // Facing a bet — thin folds, flats, raises
  if (Math.random() < 0.11) {
    const f = foldPlayer(state, pid)
    if (f !== state) return f
  }
  const minRaise = bb
  if (Math.random() < 0.14 && br >= toCall + minRaise) {
    const raised = playerRaise(state, pid, minRaise)
    if (raised !== state) return raised
  }
  let c = playerCall(state, pid)
  if (c !== state) return c

  const f = foldPlayer(state, pid)
  if (f !== state) return f
  return state
}

/** What this seat will do in the answer window. Stable for the hand, so a step can finish. */
export type RehearsalAnswerScript = 'leave' | 'blank' | 'wild' | 'revise' | 'near' | 'close'

function unitHash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/**
 * One phone-shaped choice for the hand: most seats try, some miss or edit,
 * a few never lock, and a rare seat walks off or submits an extreme legal number.
 */
export function rehearsalAnswerScript(playerId: string, roundId: string): RehearsalAnswerScript {
  const unit = unitHash(`${roundId}\0${playerId}`)
  if (unit < 0.01) return 'leave'
  if (unit < 0.09) return 'blank'
  if (unit < 0.13) return 'wild'
  if (unit < 0.25) return 'revise'
  if (unit < 0.55) return 'near'
  return 'close'
}

function hashIndex(playerId: string, roundId: string, salt: string, count: number): number {
  if (count <= 1) return 0
  return Math.floor(unitHash(`${roundId}\0${playerId}\0${salt}`) * count)
}

function sevenDigits(player: PlayerState, state: GameState): number[] {
  return [...player.hand, ...state.round.communityCards].map((card) => card.digit)
}

function legalAnswers(digits: number[]): number[] {
  return [...composeNumericAnswersFromSevenDigitCards(digits)].sort((a, b) => a - b)
}

function nearMiss(values: number[], target: number, playerId: string, roundId: string): number {
  const ranked = [...values].sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b)
  const closest = ranked[0]
  if (closest == null) return 0
  const rest = ranked.filter((value) => !nearlyEqualNumbers(value, closest))
  if (rest.length === 0) return closest
  const window = rest.slice(0, Math.min(8, rest.length))
  return window[hashIndex(playerId, roundId, 'near', window.length)] ?? closest
}

function wildAnswer(values: number[], playerId: string, roundId: string): number {
  const pickMax = unitHash(`${roundId}\0${playerId}\0wild`) >= 0.5
  return pickMax ? values[values.length - 1]! : values[0]!
}

function otherLegal(values: number[], first: number, playerId: string, roundId: string): number {
  const extreme = wildAnswer(values, playerId, roundId)
  if (!nearlyEqualNumbers(extreme, first)) return extreme
  return values.find((value) => !nearlyEqualNumbers(value, first)) ?? first
}

function lockGuess(state: GameState, player: PlayerState, answer: number): GameState {
  const composition = inferAnswerComposition(player.hand, state.round.communityCards, answer)
  return submitAnswer(state, player.id, answer, composition ?? undefined)
}

function applyRevise(state: GameState, player: PlayerState, values: number[], target: number): GameState {
  const first = nearMiss(values, target, player.id, state.round.roundId)
  const second = otherLegal(values, first, player.id, state.round.roundId)
  if (player.submittedAnswer === undefined) return lockGuess(state, player, first)
  if (!nearlyEqualNumbers(second, first) && nearlyEqualNumbers(player.submittedAnswer, first)) {
    return lockGuess(state, player, second)
  }
  return state
}

function leaveIfNotAlone(state: GameState, player: PlayerState): GameState {
  if (state.players.length <= 1) return state
  return releasePlayer(state, player.id)
}

function lockFreshGuess(
  state: GameState,
  player: PlayerState,
  script: RehearsalAnswerScript,
  values: number[],
  target: number,
): GameState {
  if (player.submittedAnswer !== undefined) return state
  const roundId = state.round.roundId
  const answer =
    script === 'near'
      ? nearMiss(values, target, player.id, roundId)
      : script === 'wild'
        ? wildAnswer(values, player.id, roundId)
        : nearestLegalAnswerToTarget(sevenDigits(player, state), target)
  return lockGuess(state, player, answer)
}

function applyOneAnswer(state: GameState, player: PlayerState, script: RehearsalAnswerScript): GameState {
  if (script === 'blank') return state
  if (script === 'leave') return leaveIfNotAlone(state, player)
  const values = legalAnswers(sevenDigits(player, state))
  if (values.length === 0 || state.round.question == null) return state
  if (script === 'revise') return applyRevise(state, player, values, state.round.question.answer)
  return lockFreshGuess(state, player, script, values, state.round.question.answer)
}

/** One phone action: lock, edit, or walk away. Blank seats are skipped. */
function actVirtualAnswering(state: GameState): GameState {
  if (state.round.question == null || state.round.communityCards.length !== 5) return state
  const nudged = takeNudgedGuess(state)
  if (nudged) return nudged
  for (const player of state.players) {
    if (!isVirtualPlayerId(player.id) || player.hand.length !== 2) continue
    const next = applyOneAnswer(state, player, rehearsalAnswerScript(player.id, state.round.roundId))
    if (next !== state) return next
  }
  return state
}

/** One deterministic step so real players can join between bot actions after each broadcast. */
function stepVirtualSimulation(state: GameState): GameState {
  if (!state.players.some(p => isVirtualPlayerId(p.id))) return state

  state = normalizeBettingTurn(state)

  if (state.phase === 'answering') return actVirtualAnswering(state)

  if (state.phase !== 'betting' || state.round.isBettingOpen === false) return state

  const idx = typeof state.round.currentPlayerIndex === 'number' ? state.round.currentPlayerIndex : -1
  if (idx < 0 || idx >= state.players.length) return state

  const seat = state.players[idx]
  if (!seat || !isVirtualPlayerId(seat.id) || seat.hasFolded || seat.isAllIn) return state

  const pid = seat.id

  const chosen = actVirtualBetting(state, pid)
  if (chosen !== state) return chosen
  return forcedTurnAction(state, pid)
}

/** Large tables may need hundreds of sequential CPU actions across two wagering waves. */
function maxSimulationSteps(gs: GameState): number {
  const n = Math.max(4, gs.players.length)
  return Math.min(10_000, Math.max(2_400, n * 180))
}

/** Single VP step — answering or virtual seat’s betting action — no-op when idle or when a human must act. */
export function advanceVirtualBettingStep(state: GameState): GameState {
  return stepVirtualSimulation(state)
}

/** Run bots until idle or iteration cap (whole table loop). */
export function runVirtualPlayerSimulation(state: GameState): GameState {
  let s = state
  const cap = maxSimulationSteps(s)
  for (let i = 0; i < cap; i++) {
    const next = stepVirtualSimulation(s)
    if (next === s) break
    s = next
  }
  return s
}
