type StickyQuestionBarProps = {
  questionText: string
  pot?: number
  /** Seated table id so two phones can confirm they share a felt. */
  tableId?: string | null
}

/** Keeps the trivia question visible above the fold / near the thumb dock. */
export default function StickyQuestionBar({ questionText, pot, tableId }: StickyQuestionBarProps) {
  if (!questionText.trim()) return null

  const tableLabel =
    typeof tableId === 'string' && tableId.trim() && tableId.trim().toUpperCase() !== 'LOBBY'
      ? tableId.trim()
      : null

  return (
    <div className="player-sticky-question" role="status">
      <p className="player-sticky-question-label">
        Question
        {tableLabel ? (
          <span className="player-sticky-question-table"> · Table {tableLabel}</span>
        ) : null}
        {typeof pot === 'number' ? (
          <span className="player-sticky-question-pot"> · Pot ${pot.toLocaleString()}</span>
        ) : null}
      </p>
      <p className="player-sticky-question-text">{questionText}</p>
    </div>
  )
}
