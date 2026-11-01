import type { GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow } from '@qhe/net'
import {
  hostRunOfShowHeadline,
  isHostWaitingForJoiners,
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
  opts?: { hasActiveSetlist?: boolean; nextQuestionText?: string; afterPayout?: boolean },
): HostPacingSuggestion {
  const stepId = resolveRunOfShowStepForHost(gameState, venueBeat)
  const headline = hostRunOfShowHeadline(gameState, venueBeat, opts)
  const detail = headline.detail ?? 'Follow the primary cue below.'

  if (isHostWaitingForJoiners(gameState)) {
    return {
      stepId,
      title: headline.title,
      detail: headline.detail ?? detail,
      urgency: 'ready',
    }
  }

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
      detail: `${detail} Tip: Nudge a slow player (30s, then auto-acts), then close betting.`,
      urgency: 'now',
    }
  }

  if (stepId === 'reveal') {
    return {
      stepId,
      title: 'Reveal when ready',
      detail:
        'Closes answers and puts the correct answer and closest guesses on the TVs. Pay winners when you are ready.',
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
            'Answer is on the TVs. Pay winners when you are ready.')
          : 'Pays pots. The TVs stay on the tables until you put up the next screen.',
      urgency: 'now',
    }
  }

  return { stepId, title: headline.title, detail, urgency }
}
