import { useEffect, useRef, useState } from 'react'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import type { ShowdownResultRow } from './showdownDisplay'
import { buildVenueWallTileRows } from './venueWallModel'
import { showdownCorrectAnswerRowFromTile } from './showdownDisplay'

export const VENUE_ANSWER_REVEAL_DWELL_MS = 5000

export type VenueAnswerRevealPayload = {
  question: string
  answer: number
  answerRow: ShowdownResultRow | null
}

export type VenueAnswerRevealState = {
  visible: boolean
  payload: VenueAnswerRevealPayload | null
}

/**
 * Full-screen question + answer reveal when the venue-wide answer countdown ends.
 * Each deadline fires at most once per display tab.
 */
export function useVenueAnswerReveal(
  wall: DisplayVenueWallSnapshot | null,
): VenueAnswerRevealState {
  const prevWallRef = useRef<DisplayVenueWallSnapshot | null>(null)
  const revealedDeadlineRef = useRef<number | null>(null)
  const dwellTimerRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [payload, setPayload] = useState<VenueAnswerRevealPayload | null>(null)

  useEffect(() => {
    return () => {
      if (dwellTimerRef.current != null) window.clearTimeout(dwellTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (wall == null) {
      prevWallRef.current = null
      return
    }

    const prev = prevWallRef.current
    prevWallRef.current = wall
    if (prev == null) return

    const deadlineEnded =
      prev.answerDeadlineMs != null &&
      wall.answerDeadlineMs == null &&
      revealedDeadlineRef.current !== prev.answerDeadlineMs

    if (!deadlineEnded) return

    const question =
      wall.headlineQuestionText?.trim() || prev.headlineQuestionText?.trim() || null
    const answer =
      typeof wall.headlineQuestionAnswer === 'number' &&
      Number.isFinite(wall.headlineQuestionAnswer)
        ? wall.headlineQuestionAnswer
        : typeof prev.headlineQuestionAnswer === 'number' &&
            Number.isFinite(prev.headlineQuestionAnswer)
          ? prev.headlineQuestionAnswer
          : null

    if (question == null || answer == null) return

    revealedDeadlineRef.current = prev.answerDeadlineMs

    const tiles = buildVenueWallTileRows(wall)
    const headlineNum = wall.headlineTableNum ?? prev.headlineTableNum
    const headlineTile =
      (headlineNum != null && Number.isFinite(headlineNum)
        ? tiles.find((t) => t.tableNum === Math.floor(headlineNum))
        : null) ?? tiles.find((t) => (t.communityDigits?.length ?? 0) >= 5) ?? null

    const composition =
      wall.headlineAnswerComposition ?? prev.headlineAnswerComposition ?? null
    const answerRow =
      headlineTile != null
        ? showdownCorrectAnswerRowFromTile(headlineTile, answer, composition)
        : null

    setPayload({ question, answer, answerRow })
    setVisible(true)

    if (dwellTimerRef.current != null) window.clearTimeout(dwellTimerRef.current)
    dwellTimerRef.current = window.setTimeout(() => {
      dwellTimerRef.current = null
      setVisible(false)
    }, VENUE_ANSWER_REVEAL_DWELL_MS)
  }, [wall])

  return { visible, payload: visible ? payload : null }
}
