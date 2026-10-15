import { inChipContest, type PlayerState } from '@qhe/core'

export type HostContestKind = 'pot' | 'points'

export type HostContestStatus = {
  kind: HostContestKind
  /** Short badge label. */
  label: string
  /** Why they're points-only (when kind === 'points'). */
  reason: 'folded' | 'busted' | null
  detail: string
}

/** Chip pot eligibility for host UI: pot = still contesting chips; points = trivia only. */
export function hostContestStatus(player: Pick<PlayerState, 'hasFolded' | 'pointsOnly'>): HostContestStatus {
  if (player.pointsOnly === true) {
    return {
      kind: 'points',
      label: 'Points only',
      reason: 'busted',
      detail: 'Busted — trivia points only (not in the chip pot)',
    }
  }
  if (player.hasFolded) {
    return {
      kind: 'points',
      label: 'Points only',
      reason: 'folded',
      detail: 'Folded chips — still answers for trivia points',
    }
  }
  if (!inChipContest(player)) {
    return {
      kind: 'points',
      label: 'Points only',
      reason: 'busted',
      detail: 'Not in the chip contest — trivia points only',
    }
  }
  return {
    kind: 'pot',
    label: 'In pot',
    reason: null,
    detail: 'Still in for the chip pot',
  }
}

export function hostContestReasonLabel(status: HostContestStatus): string | null {
  if (status.reason === 'folded') return 'Folded'
  if (status.reason === 'busted') return 'Busted'
  return null
}
