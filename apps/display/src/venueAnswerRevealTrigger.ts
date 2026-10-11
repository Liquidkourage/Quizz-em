/** How long the full-screen correct-answer beat stays up. */
export const VENUE_ANSWER_REVEAL_DWELL_MS = 7000

export type VenueAnswerRevealTrigger = 'deadline' | 'showdown'

/**
 * Decide whether to fire the venue-wide correct-answer overlay.
 * Prefers the answering countdown ending; falls back to entering showdown
 * so hosts who skip the timer still get a TV beat.
 */
export function resolveVenueAnswerRevealTrigger(args: {
  prevAnswerDeadlineMs: number | null | undefined
  nextAnswerDeadlineMs: number | null | undefined
  revealedDeadlineMs: number | null
  prevInShowdown: boolean
  nextInShowdown: boolean
  revealedShowdownKey: string | null
  showdownKey: string | null
}): VenueAnswerRevealTrigger | null {
  const {
    prevAnswerDeadlineMs,
    nextAnswerDeadlineMs,
    revealedDeadlineMs,
    prevInShowdown,
    nextInShowdown,
    revealedShowdownKey,
    showdownKey,
  } = args

  const deadlineEnded =
    prevAnswerDeadlineMs != null &&
    nextAnswerDeadlineMs == null &&
    revealedDeadlineMs !== prevAnswerDeadlineMs

  if (deadlineEnded) return 'deadline'

  const showdownStarted =
    !prevInShowdown &&
    nextInShowdown &&
    showdownKey != null &&
    revealedShowdownKey !== showdownKey

  if (showdownStarted) return 'showdown'

  return null
}
