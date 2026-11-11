import type { HostVenueFeltBeatRow } from '@qhe/net'
import { parseVenueBetPhaseSig } from './hostVenueActionGates'

export type VenueFeltSnapshot = {
  seatedCount: number
  round1OpenCount: number
  round2OpenCount: number
  round1AnyOpen: boolean
  round2AnyOpen: boolean
  answeringCount: number
  showdownCount: number
  lobbyCount: number
  unanimousAnswerDeadlineMs: number | null
}

export type HostVenueAutoAlertKind =
  | 'round1-all-in'
  | 'round2-all-in'
  | 'answer-window-started'
  | 'answer-window-ended'
  | 'bets-closed'

/** How long a state-change notice stays up before the desk is clear again. */
export const HOST_VENUE_ALERT_MS = 4000

export type HostVenueAutoAlert = {
  kind: HostVenueAutoAlertKind
  title: string
  detail?: string
}

function seatedRows(felts: HostVenueFeltBeatRow[]): HostVenueFeltBeatRow[] {
  return felts.filter((r) => r.active && r.seated > 0)
}

export function snapshotVenueFeltBeat(felts: HostVenueFeltBeatRow[]): VenueFeltSnapshot {
  const seated = seatedRows(felts)
  let round1OpenCount = 0
  let round2OpenCount = 0
  let answeringCount = 0
  let showdownCount = 0
  let lobbyCount = 0
  const deadlines: number[] = []

  for (const row of seated) {
    if (row.phase === 'lobby') lobbyCount += 1
    if (row.phase === 'answering') {
      answeringCount += 1
      if (typeof row.answerDeadlineMs === 'number' && Number.isFinite(row.answerDeadlineMs)) {
        deadlines.push(row.answerDeadlineMs)
      }
    }
    if (row.phase === 'showdown' || row.phase === 'reveal' || row.phase === 'payout') {
      showdownCount += 1
    }
    const parsed = parseVenueBetPhaseSig(row.phaseStrictSig)
    if (parsed?.open === true && parsed.br === 1) round1OpenCount += 1
    if (parsed?.open === true && parsed.br === 2) round2OpenCount += 1
  }

  const unanimousAnswerDeadlineMs =
    answeringCount > 0 && deadlines.length === answeringCount && new Set(deadlines).size === 1
      ? deadlines[0]!
      : null

  return {
    seatedCount: seated.length,
    round1OpenCount,
    round2OpenCount,
    round1AnyOpen: round1OpenCount > 0,
    round2AnyOpen: round2OpenCount > 0,
    answeringCount,
    showdownCount,
    lobbyCount,
    unanimousAnswerDeadlineMs,
  }
}

/** A banner only when every open betting round has just closed. */
export function detectVenueAutoAlerts(
  prev: VenueFeltSnapshot | null,
  next: VenueFeltSnapshot,
): HostVenueAutoAlert[] {
  if (prev == null) return []
  const wasOpen = prev.round1AnyOpen || prev.round2AnyOpen
  const stillOpen = next.round1AnyOpen || next.round2AnyOpen
  if (!wasOpen || stillOpen) return []
  return [{ kind: 'bets-closed', title: 'All bets are closed' }]
}

/** Success toasts that only repeat the desk stay in the corner log, not the Update banner. */
export function hostVenueAutoAlertFromToast(_message: string): HostVenueAutoAlert | null {
  return null
}

export function hostVenueAutoAlertTone(
  kind: HostVenueAutoAlertKind,
): 'emerald' | 'purple' | 'amber' | 'cyan' {
  switch (kind) {
    case 'round1-all-in':
    case 'round2-all-in':
      return 'emerald'
    case 'answer-window-started':
      return 'purple'
    case 'answer-window-ended':
    case 'bets-closed':
      return 'amber'
  }
}
