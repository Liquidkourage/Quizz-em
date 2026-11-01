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

type RevealedMarks = {
  revealedDeadlineMs: number | null
  revealedShowdownKey: string | null
}

type OpenedAnswerReveal = RevealedMarks & {
  payload: VenueAnswerRevealPayload
}

function wallInShowdown(wall: DisplayVenueWallSnapshot): boolean {
  return showdownTableNums(buildVenueWallTileRows(wall)).length > 0
}

function finiteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function resolveQuestionAnswer(wall: DisplayVenueWallSnapshot, prev: DisplayVenueWallSnapshot | null) {
  const question = wall.headlineQuestionText?.trim() || prev?.headlineQuestionText?.trim() || null
  const answer = finiteNumber(wall.headlineQuestionAnswer) ?? finiteNumber(prev?.headlineQuestionAnswer)
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

function headlineTileFor(wall: DisplayVenueWallSnapshot, prev: DisplayVenueWallSnapshot | null) {
  const tiles = buildVenueWallTileRows(wall)
  const headlineNum = finiteNumber(wall.headlineTableNum ?? prev?.headlineTableNum)
  if (headlineNum != null) {
    const match = tiles.find((t) => t.tableNum === Math.floor(headlineNum))
    if (match) return match
  }
  return tiles.find((t) => (t.communityDigits?.length ?? 0) >= 5) ?? null
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

  const headlineTile = headlineTileFor(wall, prev)
  const composition = wall.headlineAnswerComposition ?? prev.headlineAnswerComposition ?? null
  return {
    payload: {
      question,
      answer,
      answerRow:
        headlineTile != null
          ? showdownCorrectAnswerRowFromTile(headlineTile, answer, composition)
          : null,
    },
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
    const opened = openAnswerReveal(wall, prev, {
      revealedDeadlineMs: revealedDeadlineRef.current,
      revealedShowdownKey: revealedShowdownKeyRef.current,
    })
    if (opened == null) return

    revealedDeadlineRef.current = opened.revealedDeadlineMs
    revealedShowdownKeyRef.current = opened.revealedShowdownKey
    setPayload(opened.payload)
    setVisible(true)

    if (dwellTimerRef.current != null) window.clearTimeout(dwellTimerRef.current)
    dwellTimerRef.current = window.setTimeout(() => {
      dwellTimerRef.current = null
      setVisible(false)
    }, VENUE_ANSWER_REVEAL_DWELL_MS)
  }, [wall])

  return { visible, payload: visible ? payload : null }
}
