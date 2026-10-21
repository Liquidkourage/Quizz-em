import type { GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import {
  hostRunOfShowHeadline,
  resolveRunOfShowStepForHost,
  type RunOfShowStepId,
} from './hostDeskLayout'

export type HostPacingSuggestion = {
  stepId: RunOfShowStepId
  title: string
  detail: string
  urgency: 'now' | 'soon' | 'ready'
}

/**
 * Turn the run-of-show step into an assertive “suggested next” cue for the host desk.
 */
export function suggestNextHostAction(
  gameState: GameState,
  venueBeat: HostVenueFeltBeatRow[] | null,
  opts?: { hasActiveSetlist?: boolean },
): HostPacingSuggestion {
  const stepId = resolveRunOfShowStepForHost(gameState, venueBeat)
  const headline = hostRunOfShowHeadline(gameState, venueBeat, opts)
  const detail = headline.detail ?? 'Follow the primary cue below.'

  let urgency: HostPacingSuggestion['urgency'] = 'ready'
  if (
    stepId === 'close-bet-1' ||
    stepId === 'close-bet-2' ||
    stepId === 'reveal' ||
    stepId === 'end-round' ||
    stepId === 'start-answer'
  ) {
    urgency = 'now'
  } else if (stepId === 'deal-board' || stepId === 'question') {
    urgency = 'soon'
  }

  // Stronger copy when waiting on a stalled actor or answer window.
  if (stepId === 'close-bet-1' || stepId === 'close-bet-2') {
    return {
      stepId,
      title: headline.title,
      detail: `${detail} Tip: Nudge stalls (30s → auto check/fold), then close betting.`,
      urgency: 'now',
    }
  }

  if (stepId === 'reveal') {
    return {
      stepId,
      title: 'Reveal when ready',
      detail:
        'Closes answers, plays the short reveal beat on TVs, then auto-advances to showdown. You can End round during reveal if you need to settle early.',
      urgency: 'now',
    }
  }

  if (stepId === 'end-round') {
    return {
      stepId,
      title: headline.title,
      detail:
        gameState.phase === 'reveal'
          ? (headline.detail ??
            'TVs are on the reveal beat. Wait for showdown, or End round now to settle early.')
          : 'Pays pots and starts produced payout → intermission beats on TVs before the leaderboard.',
      urgency: 'now',
    }
  }

  return { stepId, title: headline.title, detail, urgency }
}
