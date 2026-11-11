export type ResolvedPreAction = 'check' | 'call' | 'fold'

/** Blank turns Auto-Action off. Zero is a real limit: check if free, otherwise fold. */
export function autoCallLimitFromInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  return Number(trimmed)
}

/**
 * The limit is the extra chips the player will call. A free check always checks.
 * A bigger call folds. This never raises.
 */
export function resolveAutoAction(limit: number, toCall: number): ResolvedPreAction {
  const cap = Math.max(0, Math.floor(limit))
  const owed = Math.max(0, Math.floor(Number.isFinite(toCall) ? toCall : 0))
  if (owed === 0) return 'check'
  if (owed <= cap) return 'call'
  return 'fold'
}

/** Short line after Auto-Action fires. A call names the chips actually put in. */
export function preActionAlert(action: ResolvedPreAction, toCall: number, bankroll: number): string {
  if (action === 'check') return 'Checked'
  if (action === 'fold') return 'Folded'
  const owed = Number.isFinite(toCall) ? Math.max(0, Math.floor(toCall)) : 0
  const stack = Number.isFinite(bankroll) ? Math.max(0, Math.floor(bankroll)) : 0
  const chips = Math.min(owed, stack)
  if (chips <= 0) return 'Called'
  return `Called $${chips.toLocaleString('en-US')}`
}

export function bettingTurnKey(roundId: string, bettingRound: number, seat: number): string {
  return `${roundId}:${bettingRound}:${seat}`
}

/** No key until this hand has a street and a seat to act. */
export function bettingTurnKeyFromRound(round: {
  roundId: string
  bettingRound?: number | null
  currentPlayerIndex?: number | null
}): string | null {
  if (typeof round.bettingRound !== 'number' || typeof round.currentPlayerIndex !== 'number') return null
  return bettingTurnKey(round.roundId, round.bettingRound, round.currentPlayerIndex)
}

/** True when this seat has not already acted for the current turn. */
export function autoActionShouldFire(
  limit: number | null,
  isMyTurn: boolean,
  turnKey: string,
  actedTurnKey: string,
): boolean {
  return limit != null && isMyTurn && turnKey !== actedTurnKey
}
