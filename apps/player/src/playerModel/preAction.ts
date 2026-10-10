import type { BettingContext } from './bettingModel'

/** Queued action applied automatically when it becomes your turn. */
export type PreAction =
  | { kind: 'checkFold' }
  | { kind: 'callAny' }
  /** Call if the bet level is still ≤ maxBet when your turn arrives; otherwise fold. */
  | { kind: 'callFold'; maxBet: number }

export type ResolvedPreAction = 'check' | 'call' | 'fold'

export function resolvePreAction(pre: PreAction, ctx: BettingContext): ResolvedPreAction {
  if (pre.kind === 'checkFold') {
    return ctx.toCall === 0 ? 'check' : 'fold'
  }
  if (pre.kind === 'callAny') {
    return ctx.toCall === 0 ? 'check' : 'call'
  }
  // call/fold — cancel into a fold if someone raised past the locked bet level
  if (ctx.toCall === 0) return 'check'
  if (ctx.currentBet <= pre.maxBet) return 'call'
  return 'fold'
}

export function preActionLabel(pre: PreAction | null): string {
  if (!pre) return ''
  if (pre.kind === 'checkFold') return 'Check/Fold'
  if (pre.kind === 'callAny') return 'Call Any'
  return 'Call/Fold'
}
