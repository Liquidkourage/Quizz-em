import { useEffect, useRef, useState } from 'react'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { buildVenueWallTileRows, venuePublicAnswerReleased } from './venueWallModel'
import {
  resolveVenueAnswerRevealTrigger,
  VENUE_ANSWER_REVEAL_DWELL_MS,
} from './venueAnswerRevealTrigger'

export { VENUE_ANSWER_REVEAL_DWELL_MS }

export type VenueAnswerRevealPayload = {
  question: string
  answer: number
}

export type VenueAnswerRevealState = {
  visible: boolean
  payload: VenueAnswerRevealPayload | null
}

type RevealedMarks = {
  revealedDeadlineMs: number | null
  revealedShowdownKey: string | null
}

type OpenedAnswerReveal = RevealedMarks & {
  payload: VenueAnswerRevealPayload
}

function wallInShowdown(wall: DisplayVenueWallSnapshot): boolean {
  return venuePublicAnswerReleased(buildVenueWallTileRows(wall))
}

function finiteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function resolveQuestionAnswer(wall: DisplayVenueWallSnapshot, prev: DisplayVenueWallSnapshot | null) {
  const question = wall.headlineQuestionText?.trim() || prev?.headlineQuestionText?.trim() || null
  const answer = finiteNumber(wall.headlineQuestionAnswer)
  return { question, answer }
}

function revealShowdownKey(
  wall: DisplayVenueWallSnapshot,
  question: string | null,
  answer: number | null,
): string | null {
  if (question != null && answer != null) return `${answer}|${question}`
  const handEnd = finiteNumber(wall.lastHandEndMs)
  return handEnd != null ? `hand:${handEnd}` : null
}

function nextRevealedMarks(
  trigger: 'deadline' | 'showdown',
  prev: DisplayVenueWallSnapshot,
  showdownKey: string | null,
  revealed: RevealedMarks,
): RevealedMarks {
  const deadlineEnded = trigger === 'deadline' && prev.answerDeadlineMs != null
  return {
    revealedDeadlineMs: deadlineEnded ? prev.answerDeadlineMs : revealed.revealedDeadlineMs,
    revealedShowdownKey: showdownKey ?? revealed.revealedShowdownKey,
  }
}

function openAnswerReveal(
  wall: DisplayVenueWallSnapshot,
  prev: DisplayVenueWallSnapshot | null,
  revealed: RevealedMarks,
): OpenedAnswerReveal | null {
  if (prev == null) return null
  if (!venuePublicAnswerReleased(buildVenueWallTileRows(wall))) return null

  const { question, answer } = resolveQuestionAnswer(wall, prev)
  const showdownKey = revealShowdownKey(wall, question, answer)
  const trigger = resolveVenueAnswerRevealTrigger({
    prevAnswerDeadlineMs: prev.answerDeadlineMs,
    nextAnswerDeadlineMs: wall.answerDeadlineMs,
    revealedDeadlineMs: revealed.revealedDeadlineMs,
    prevInShowdown: wallInShowdown(prev),
    nextInShowdown: wallInShowdown(wall),
    revealedShowdownKey: revealed.revealedShowdownKey,
    showdownKey,
  })
  if (trigger == null || question == null || answer == null) return null

  return {
    payload: { question, answer },
    ...nextRevealedMarks(trigger, prev, showdownKey, revealed),
  }
}

/**
 * Popup with the correct answer when the countdown ends or the floor enters showdown.
 * It closes on its own so the guesses underneath are visible again.
 */
export function useVenueAnswerReveal(
  wall: DisplayVenueWallSnapshot | null,
): VenueAnswerRevealState {
  const dwellTimerRef = useRef<number | null>(null)
  const [prevWall, setPrevWall] = useState<DisplayVenueWallSnapshot | null>(null)
  const [revealed, setRevealed] = useState<RevealedMarks>({
    revealedDeadlineMs: null,
    revealedShowdownKey: null,
  })
  const [visible, setVisible] = useState(false)
  const [payload, setPayload] = useState<VenueAnswerRevealPayload | null>(null)

  if (wall !== prevWall) {
    const opened = wall == null ? null : openAnswerReveal(wall, prevWall, revealed)
    setPrevWall(wall)
    if (opened != null) {
      setRevealed({
        revealedDeadlineMs: opened.revealedDeadlineMs,
        revealedShowdownKey: opened.revealedShowdownKey,
      })
      setPayload(opened.payload)
      setVisible(true)
    }
  }

  useEffect(() => {
    if (!visible) return
    dwellTimerRef.current = window.setTimeout(() => {
      dwellTimerRef.current = null
      setVisible(false)
    }, VENUE_ANSWER_REVEAL_DWELL_MS)
    return () => {
      if (dwellTimerRef.current != null) window.clearTimeout(dwellTimerRef.current)
    }
  }, [visible, payload])

  return { visible, payload: visible ? payload : null }
}
