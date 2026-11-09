import type { GameState, PlayerState, SeatBettingAction } from '@qhe/core'
import { isWageringPaused } from '@qhe/core'

export const SEAT_BETTING_ACTION_LABELS: Record<SeatBettingAction, string> = {
  check: 'CHECK',
  call: 'CALL',
  raise: 'RAISE',
  fold: 'FOLD',
  allIn: 'ALL-IN',
}

const RUNOUT_ANSWER_OPENS = 'Your answer opens as soon as the five community cards are out.'

/** Waiting line while the board runs out. Names this player's own reason for waiting. */
export function runoutAnswerLine(
  player: Pick<PlayerState, 'hasFolded' | 'pointsOnly'> | null | undefined,
): string {
  if (player?.hasFolded === true) return `You folded. ${RUNOUT_ANSWER_OPENS}`
  if (player?.pointsOnly === true) return RUNOUT_ANSWER_OPENS
  return `All-in. ${RUNOUT_ANSWER_OPENS}`
}

/** Verb for status-line copy (sentence case). */
const SEAT_BETTING_ACTION_VERBS: Record<SeatBettingAction, string> = {
  check: 'checked',
  call: 'called',
  raise: 'raised',
  fold: 'folded',
  allIn: 'went all-in',
}

/** Prefer punchier actions when synthesizing a “last action” without timestamps. */
const ACTION_PRIORITY: Record<SeatBettingAction, number> = {
  raise: 5,
  allIn: 4,
  call: 3,
  check: 2,
  fold: 1,
}

export function seatBettingActionLabel(action: SeatBettingAction): string {
  return SEAT_BETTING_ACTION_LABELS[action]
}

/** Action line: first name, plus the number when a later Chris L. is Chris L. 2. */
function statusPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const given = parts[0] || name.trim()
  const last = parts[parts.length - 1] ?? ''
  if (parts.length >= 3 && /^\d+$/.test(last)) return `${given} ${last}`
  return given
}

/**
 * Roster label: keep last initial so two “Jay …” seats stay distinguishable
 * (`Jay B.` / `Jay C.`), not both collapsing to “Jay”.
 */
export function rosterDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!
  const last = parts[parts.length - 1]!
  if (/^\d+$/.test(last) && parts.length >= 3) {
    return `${rosterDisplayName(parts.slice(0, -1).join(' '))} ${last}`
  }
  const first = parts[0]!
  if (last.length <= 2 || last.endsWith('.')) return `${first} ${last}`
  return `${first} ${last[0]!.toUpperCase()}.`
}

export function seatStreetContribution(
  player: Pick<PlayerState, 'id'>,
  playerBets: Record<string, number> | undefined
): number {
  return Math.max(0, Math.floor(playerBets?.[player.id] ?? 0))
}

export function seatToCallAmount(
  player: Pick<PlayerState, 'id'>,
  currentBet: number | undefined,
  playerBets: Record<string, number> | undefined
): number {
  const contribution = seatStreetContribution(player, playerBets)
  return Math.max(0, Math.floor((currentBet ?? 0) - contribution))
}

/** Acting-seat pill: never “Check” (reads as already acted). */
export function formatActingCallHint(amount: number): string {
  if (amount <= 0) return 'Acting'
  return `Call $${amount.toLocaleString()}`
}

/**
 * Single status cell: action + optional street amount (keeps stack column aligned).
 * e.g. `CALL · $20`, `RAISE · $40`, `$20 in`, `FOLD`.
 */
export function formatMergedSeatStatus(args: {
  action: SeatBettingAction | null | undefined
  streetIn: number
  isAllIn: boolean
}): string | null {
  const { action, streetIn, isAllIn } = args
  const inPart = streetIn > 0 ? `$${streetIn.toLocaleString()}` : null

  if (action === 'fold') return 'FOLD'
  if (action === 'allIn' || isAllIn) {
    return inPart ? `ALL-IN · ${inPart}` : 'ALL-IN'
  }
  if (action === 'check') return 'CHECK'
  if (action === 'call') return inPart ? `CALL · ${inPart}` : 'CALL'
  if (action === 'raise') return inPart ? `RAISE · ${inPart}` : 'RAISE'
  if (inPart) return `${inPart} in`
  return null
}

export type SeatStatusPill =
  | { kind: 'acting'; label: string }
  | { kind: 'action'; action: SeatBettingAction; label: string }
  | { kind: 'allIn'; label: string }
  | { kind: 'away'; label: 'AWAY' }
  | { kind: 'street'; label: string }

/**
 * What to show in the roster status cell. Acting takes priority over last action.
 */
export function resolveSeatStatusPill(args: {
  player: PlayerState
  isActing: boolean
  lastAction: SeatBettingAction | null | undefined
  toCall: number
  streetIn: number
  isAway?: boolean
}): SeatStatusPill | null {
  const { player, isActing, lastAction, toCall, streetIn, isAway } = args

  if (isActing && !player.hasFolded) {
    return { kind: 'acting', label: formatActingCallHint(toCall) }
  }

  if (player.hasFolded || lastAction === 'fold') {
    return { kind: 'action', action: 'fold', label: 'FOLD' }
  }

  const merged = formatMergedSeatStatus({
    action: lastAction,
    streetIn,
    isAllIn: player.isAllIn,
  })
  if (merged) {
    if (lastAction === 'allIn' || player.isAllIn) {
      return { kind: 'allIn', label: merged }
    }
    if (lastAction != null) {
      return { kind: 'action', action: lastAction, label: merged }
    }
    return { kind: 'street', label: merged }
  }

  if (isAway && !player.id.startsWith('vp:')) {
    return { kind: 'away', label: 'AWAY' }
  }

  return null
}

/** Highest-priority non-null last action on the table (for status-line narrative). */
export function pickHighlightSeatAction(
  players: readonly PlayerState[],
  lastActions: readonly (SeatBettingAction | null | undefined)[] | undefined,
  excludeIndex: number | null
): { seatIndex: number; action: SeatBettingAction } | null {
  if (!lastActions) return null
  let best: { seatIndex: number; action: SeatBettingAction; priority: number } | null = null
  for (let i = 0; i < players.length; i++) {
    if (excludeIndex != null && i === excludeIndex) continue
    const action = lastActions[i]
    if (action == null) continue
    const priority = ACTION_PRIORITY[action]
    if (!best || priority > best.priority) {
      best = { seatIndex: i, action, priority }
    }
  }
  return best ? { seatIndex: best.seatIndex, action: best.action } : null
}

/**
 * One-line table HUD: “Maya raised · Jay to act · 18s”, etc.
 */
export function buildPlayerTableStatusLine(
  gameState: GameState,
  viewerName: string,
  turnRemainingSec?: number | null,
  viewerMissedGuess = false,
): string | null {
  const phase = gameState.phase
  if (phase === 'answering') return viewerMissedGuess ? null : 'Answer on your phone'

  if (phase !== 'betting') return null

  const last = lastActionPhrase(gameState, viewerName)

  if (isWageringPaused(phase, gameState.round)) {
    return last ? `${last} · No more bets` : 'No more bets'
  }

  if (gameState.round.isBettingOpen !== true) return last

  const actingIndex =
    typeof gameState.round.currentPlayerIndex === 'number' &&
    gameState.round.currentPlayerIndex >= 0
      ? gameState.round.currentPlayerIndex
      : null

  if (actingIndex == null) return null

  const actor = gameState.players[actingIndex]
  if (!actor) return null

  const actorLabel = actor.name === viewerName ? 'You' : statusPlayerName(actor.name)
  const toCall = seatToCallAmount(actor, gameState.round.currentBet, gameState.round.playerBets)

  const actPart = toCall > 0 ? `${actorLabel} to call $${toCall.toLocaleString()}` : `${actorLabel} to act`
  const clock =
    typeof turnRemainingSec === 'number' && turnRemainingSec >= 0
      ? ` · act in ${turnRemainingSec}s`
      : ''
  return last ? `${last} · ${actPart}${clock}` : `${actPart}${clock}`
}

function lastActionPhrase(gameState: GameState, viewerName: string): string | null {
  const last = gameState.round.lastPerformedAction
  if (last == null) return null
  const player = gameState.players[last.seatIndex]
  if (player == null) return null
  const who = player.name === viewerName ? 'You' : statusPlayerName(player.name)
  return `${who} ${SEAT_BETTING_ACTION_VERBS[last.action]}`
}
