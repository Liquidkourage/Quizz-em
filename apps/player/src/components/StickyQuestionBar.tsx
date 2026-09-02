type StickyQuestionBarProps = {
  questionText: string
  pot?: number
}

/** Keeps the trivia question visible above the fold / near the thumb dock. */
export default function StickyQuestionBar({ questionText, pot }: StickyQuestionBarProps) {
  if (!questionText.trim()) return null

  return (
    <div className="player-sticky-question" role="status">
      <p className="player-sticky-question-label">
        Question
        {typeof pot === 'number' ? (
          <span className="player-sticky-question-pot"> · Pot ${pot.toLocaleString()}</span>
        ) : null}
      </p>
      <p className="player-sticky-question-text">{questionText}</p>
    </div>
  )
}
