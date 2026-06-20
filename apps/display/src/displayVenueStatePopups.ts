import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'
import { venueHasOpenWagering } from './venueWallModel'

export type DisplayVenueStatePopupKind =
  | 'round1-complete'
  | 'board-dealt'
  | 'round2-complete'
  | 'answer-window-start'
  | 'answer-window-end'

export type DisplayVenueStatePopup = {
  kind: DisplayVenueStatePopupKind
  title: string
  detail?: string
}

export type DisplayVenueBeat = {
  seatedCount: number
  round1AnyOpen: boolean
  round2AnyOpen: boolean
  anyPostBoard: boolean
  answerDeadlineMs: number | null
  answeringCount: number
  showdownCount: number
  openWagering: boolean
}

function seatedTiles(tiles: DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles.filter((t) => t.seated >= 2)
}

export function snapshotDisplayVenueBeat(
  wall: DisplayVenueWallSnapshot | null,
  tiles: DisplayVenueTileSnapshot[],
): DisplayVenueBeat {
  const seated = seatedTiles(tiles)
  return {
    seatedCount: seated.length,
    round1AnyOpen: seated.some(
      (t) =>
        t.phase === 'betting' &&
        (t.bettingRound ?? 1) === 1 &&
        t.isBettingOpen === true,
    ),
    round2AnyOpen: seated.some(
      (t) => t.phase === 'betting' && t.bettingRound === 2 && t.isBettingOpen === true,
    ),
    anyPostBoard: seated.some(
      (t) =>
        (t.communityDigits?.length ?? 0) >= 5 ||
        t.bettingRound === 2 ||
        t.phase === 'answering' ||
        t.phase === 'showdown' ||
        t.phase === 'reveal',
    ),
    answerDeadlineMs: wall?.answerDeadlineMs ?? null,
    answeringCount: seated.filter((t) => t.phase === 'answering').length,
    showdownCount: seated.filter(
      (t) => t.phase === 'showdown' || t.phase === 'reveal' || t.phase === 'payout',
    ).length,
    openWagering: venueHasOpenWagering(tiles),
  }
}

function formatCountdownDetail(deadlineMs: number | null): string | undefined {
  if (deadlineMs == null) return undefined
  const sec = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000))
  return `${sec}s to submit your answer on your phone.`
}

/** Brief public-display callouts for venue-wide phase changes. */
export function detectDisplayVenueStatePopups(
  prev: DisplayVenueBeat | null,
  next: DisplayVenueBeat,
): DisplayVenueStatePopup[] {
  if (prev == null || next.seatedCount === 0) return []

  const out: DisplayVenueStatePopup[] = []

  const boardDealing = !prev.anyPostBoard && next.anyPostBoard
  if (boardDealing) {
    out.push({
      kind: 'board-dealt',
      title: 'Board is out',
      detail: 'Five community cards — round 2 wagering.',
    })
  }

  const answerWindowOpening =
    prev.answerDeadlineMs == null && next.answerDeadlineMs != null && !next.openWagering

  if (prev.round2AnyOpen && !next.round2AnyOpen && !answerWindowOpening) {
    out.push({
      kind: 'round2-complete',
      title: 'Post-board wagering closed',
      detail: 'Answer window is next.',
    })
  }

  /** Venue-wide countdown only — not when one felt can answer while others still bet. */
  if (answerWindowOpening) {
    out.push({
      kind: 'answer-window-start',
      title: 'Answer on your phone',
      detail:
        formatCountdownDetail(next.answerDeadlineMs) ??
        'Lock in your numeric guess before time runs out.',
    })
  }

  if (
    prev.answerDeadlineMs != null &&
    next.answerDeadlineMs == null &&
    next.showdownCount > 0
  ) {
    out.push({
      kind: 'answer-window-end',
      title: 'Time is up',
      detail: 'Showdown — results on the felts.',
    })
  }

  return collapseRedundantVenuePopups(out)
}

/** Prefer the stronger follow-up beat over a redundant lead-in popup. */
export function collapseRedundantVenuePopups(
  popups: DisplayVenueStatePopup[],
): DisplayVenueStatePopup[] {
  let next = popups
  if (next.some((p) => p.kind === 'board-dealt')) {
    next = next.filter((p) => p.kind !== 'round1-complete')
  }
  if (next.some((p) => p.kind === 'answer-window-start')) {
    next = next.filter((p) => p.kind !== 'round2-complete')
  }
  return next
}

/** @deprecated Use collapseRedundantVenuePopups */
export function collapseDuplicateAnswerStartPopups(
  popups: DisplayVenueStatePopup[],
): DisplayVenueStatePopup[] {
  return collapseRedundantVenuePopups(popups)
}

export function displayVenueStatePopupTone(
  kind: DisplayVenueStatePopupKind,
): 'emerald' | 'purple' | 'amber' | 'blue' {
  switch (kind) {
    case 'round1-complete':
    case 'board-dealt':
    case 'round2-complete':
      return 'emerald'
    case 'answer-window-start':
      return 'purple'
    case 'answer-window-end':
      return 'amber'
  }
}

export const DISPLAY_STATE_POPUP_DWELL_MS = 5200
export const DISPLAY_STATE_POPUP_DWELL_REDUCED_MS = 3800
