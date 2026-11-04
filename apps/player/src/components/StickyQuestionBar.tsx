import { formatTriviaPoints } from '@qhe/core'
import { ChipText } from '@qhe/ui'

type StickyQuestionBarProps = {
  questionText: string
  pot?: number
  /** Chips inside the pot that only some players can win. */
  sidePot?: number
  /** Seated table id so two phones can confirm they share a felt. */
  tableId?: string | null
  /** Busted seats: hide pot, show points-only cue. */
  pointsOnly?: boolean
  answerPoints?: number
}

function StickySidePot({ amount }: { amount?: number }) {
  if (typeof amount !== 'number' || amount <= 0) return null
  return (
    <>
      {' · Side '}
      <ChipText text={`$${amount.toLocaleString()}`} />
    </>
  )
}

/** Keeps the trivia question visible above the fold / near the thumb dock. */
export default function StickyQuestionBar({
  questionText,
  pot,
  sidePot,
  tableId,
  pointsOnly = false,
  answerPoints = 0,
}: StickyQuestionBarProps) {
  if (!questionText.trim()) return null

  const tableLabel =
    typeof tableId === 'string' && tableId.trim() && tableId.trim().toUpperCase() !== 'LOBBY'
      ? tableId.trim()
      : null

  return (
    <div
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
            <StickySidePot amount={sidePot} />
          </span>
        ) : null}
      </p>
      <p className="player-sticky-question-text">{questionText}</p>
    </div>
  )
}
