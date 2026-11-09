import { formatTriviaNumber } from '@qhe/core'

export type LeaderboardHeaderProps = {
  pageText?: string
  rankRangeText?: string
  showdownAnswer?: number
  /** Dual-trophy night: Chip leaders vs Trivia leaders. */
  title?: string
}

export function LeaderboardHeader({
  pageText,
  rankRangeText,
  showdownAnswer,
  title = 'Leaderboard',
}: LeaderboardHeaderProps) {
  return (
    <header className="venue-lb-header shrink-0">
      <div className="venue-lb-header-row">
        <h1 className="venue-lb-title">{title}</h1>

        {(pageText != null && rankRangeText != null) || showdownAnswer != null ? (
          <div className="venue-lb-header-aside flex shrink-0 flex-col items-end gap-2">
            {pageText != null && rankRangeText != null ? (
              <div className="venue-lb-page-indicator" aria-live="polite">
                <span className="venue-lb-page-label">{pageText}</span>
                <span className="venue-lb-page-range">{rankRangeText}</span>
              </div>
            ) : null}
            {showdownAnswer != null ? (
              <div
                className="venue-lb-answer-card"
                aria-label={`Correct answer ${formatTriviaNumber(showdownAnswer)}`}
              >
                <span className="venue-lb-answer-label">Correct answer</span>
                <div className="venue-lb-answer-value">{formatTriviaNumber(showdownAnswer)}</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
