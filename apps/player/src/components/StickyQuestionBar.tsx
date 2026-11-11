import { useLayoutEffect, useRef } from 'react'
import { formatTriviaPoints } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import { fitStickyQuestion } from '../playerModel/fitQuestionFont'

type StickyQuestionBarProps = {
  questionText: string
  pot?: number
  /** Seated table id so two phones can confirm they share a felt. */
  tableId?: string | null
  /** Busted seats: hide pot, show points-only cue. */
  pointsOnly?: boolean
  answerPoints?: number
}

/** Keeps the trivia question visible above the fold / near the thumb dock. */
export default function StickyQuestionBar({
  questionText,
  pot,
  tableId,
  pointsOnly = false,
  answerPoints = 0,
}: StickyQuestionBarProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    const text = textRef.current
    if (!host || !text) return
    const portrait = window.matchMedia('(orientation: portrait)')
    const fit = () => {
      if (!portrait.matches) {
        text.style.fontSize = ''
        return
      }
      fitStickyQuestion(host, text)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(host)
    portrait.addEventListener('change', fit)
    return () => {
      observer.disconnect()
      portrait.removeEventListener('change', fit)
    }
  }, [questionText])

  if (!questionText.trim()) return null

  const tableLabel =
    typeof tableId === 'string' && tableId.trim() && tableId.trim().toUpperCase() !== 'LOBBY'
      ? tableId.trim()
      : null

  return (
    <div
      ref={hostRef}
      className={`player-sticky-question${pointsOnly ? ' player-sticky-question--points-only' : ''}`}
      role="status"
    >
      <p className="player-sticky-question-label">
        Question
        {tableLabel ? (
          <span className="player-sticky-question-table"> · Table {tableLabel}</span>
        ) : null}
        {pointsOnly ? (
          <span className="player-sticky-question-pts">
            {' · Points only · '}
            {formatTriviaPoints(answerPoints)} pts
          </span>
        ) : typeof pot === 'number' ? (
          <span className="player-sticky-question-pot">
            {' · Pot '}
            <ChipText text={`$${pot.toLocaleString()}`} />
          </span>
        ) : null}
      </p>
      <p ref={textRef} className="player-sticky-question-text">{questionText}</p>
    </div>
  )
}
