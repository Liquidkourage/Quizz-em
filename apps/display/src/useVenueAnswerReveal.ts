import { useEffect, useRef, useState } from 'react'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import type { ShowdownResultRow } from './showdownDisplay'
import { buildVenueWallTileRows, showdownTableNums } from './venueWallModel'
import { showdownCorrectAnswerRowFromTile } from './showdownDisplay'
import {
  resolveVenueAnswerRevealTrigger,
  VENUE_ANSWER_REVEAL_DWELL_MS,
} from './venueAnswerRevealTrigger'

export { VENUE_ANSWER_REVEAL_DWELL_MS }

export type VenueAnswerRevealPayload = {
  question: string
  answer: number
  answerRow: ShowdownResultRow | null
}

export type VenueAnswerRevealState = {
  visible: boolean
  payload: VenueAnswerRevealPayload | null
}

function wallInShowdown(wall: DisplayVenueWallSnapshot): boolean {
  return showdownTableNums(buildVenueWallTileRows(wall)).length > 0
}

function resolveQuestionAnswer(wall: DisplayVenueWallSnapshot, prev: DisplayVenueWallSnapshot | null) {
  const question =
    wall.headlineQuestionText?.trim() || prev?.headlineQuestionText?.trim() || null
  const answer =
    typeof wall.headlineQuestionAnswer === 'number' && Number.isFinite(wall.headlineQuestionAnswer)
      ? wall.headlineQuestionAnswer
      : typeof prev?.headlineQuestionAnswer === 'number' &&
          Number.isFinite(prev.headlineQuestionAnswer)
        ? prev.headlineQuestionAnswer
        : null
  return { question, answer }
}

/**
 * Full-screen question + answer reveal when the venue-wide answer countdown ends,
 * or when the floor first enters showdown (backup if the deadline edge was missed).
 */
export function useVenueAnswerReveal(
  wall: DisplayVenueWallSnapshot | null,
): VenueAnswerRevealState {
  const prevWallRef = useRef<DisplayVenueWallSnapshot | null>(null)
  const revealedDeadlineRef = useRef<number | null>(null)
  const revealedShowdownKeyRef = useRef<string | null>(null)
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

    const { question, answer } = resolveQuestionAnswer(wall, prev)
    const showdownKey =
      question != null && answer != null
        ? `${answer}|${question}`
        : typeof wall.lastHandEndMs === 'number'
          ? `hand:${wall.lastHandEndMs}`
          : null

    const trigger = resolveVenueAnswerRevealTrigger({
      prevAnswerDeadlineMs: prev.answerDeadlineMs,
      nextAnswerDeadlineMs: wall.answerDeadlineMs,
      revealedDeadlineMs: revealedDeadlineRef.current,
      prevInShowdown: wallInShowdown(prev),
      nextInShowdown: wallInShowdown(wall),
      revealedShowdownKey: revealedShowdownKeyRef.current,
      showdownKey,
    })

    if (trigger == null || question == null || answer == null) return

    if (trigger === 'deadline' && prev.answerDeadlineMs != null) {
      revealedDeadlineRef.current = prev.answerDeadlineMs
    }
    if (showdownKey != null) {
      revealedShowdownKeyRef.current = showdownKey
    }

    const tiles = buildVenueWallTileRows(wall)
    const headlineNum = wall.headlineTableNum ?? prev.headlineTableNum
    const headlineTile =
      (headlineNum != null && Number.isFinite(headlineNum)
        ? tiles.find((t) => t.tableNum === Math.floor(headlineNum))
        : null) ??
      tiles.find((t) => (t.communityDigits?.length ?? 0) >= 5) ??
      null

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
