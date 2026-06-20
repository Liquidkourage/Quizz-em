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

function formatDeadlineDetail(deadlineMs: number | null): string | undefined {
  if (deadlineMs == null) return undefined
  const sec = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))
  return `${sec}s countdown on every felt — players submit guesses on their phones.`
}

export function detectVenueAutoAlerts(
  prev: VenueFeltSnapshot | null,
  next: VenueFeltSnapshot,
): HostVenueAutoAlert[] {
  if (prev == null || next.seatedCount === 0) return []

  const out: HostVenueAutoAlert[] = []

  if (prev.round1AnyOpen && !next.round1AnyOpen) {
    out.push({
      kind: 'round1-all-in',
      title: 'Round 1 complete',
      detail: 'All pre-board wagers are in on every table.',
    })
  }

  if (prev.round2AnyOpen && !next.round2AnyOpen) {
    out.push({
      kind: 'round2-all-in',
      title: 'Round 2 complete',
      detail: 'All post-board wagers are in — answer window is next.',
    })
  }

  if (prev.answeringCount === 0 && next.answeringCount > 0) {
    out.push({
      kind: 'answer-window-started',
      title: 'Answer window started',
      detail:
        formatDeadlineDetail(next.unanimousAnswerDeadlineMs) ??
        'Players can lock in numeric guesses on their phones.',
    })
  }

  if (prev.answeringCount > 0 && next.answeringCount === 0 && next.showdownCount > 0) {
    out.push({
      kind: 'answer-window-ended',
      title: 'Answer window closed',
      detail: 'Showdown is running on the venue felts.',
    })
  }

  return out
}

/** Promote server venue-wide auto toasts into the same banner treatment. */
export function hostVenueAutoAlertFromToast(message: string): HostVenueAutoAlert | null {
  const m = message.trim()
  if (m.includes('board dealt')) {
    return {
      kind: 'round1-all-in',
      title: 'Board dealt',
      detail: m,
    }
  }
  if (m.includes('showdown in 45 seconds')) {
    return {
      kind: 'answer-window-started',
      title: 'All post-board bets in',
      detail: m,
    }
  }
  if (m.includes('Answer window closed')) {
    return {
      kind: 'answer-window-ended',
      title: 'Answer window closed',
      detail: m,
    }
  }
  if (m.includes('Answering opened')) {
    return {
      kind: 'answer-window-started',
      title: 'Answer window started',
      detail: m,
    }
  }
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
      return 'amber'
  }
}
