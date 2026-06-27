import { Fragment } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import { QuizzEmWordmark } from '@qhe/ui'

export type LeaderboardHeaderProps = {
  metaParts: string[]
  pageText?: string
  rankRangeText?: string
  showdownAnswer?: number
}

export function LeaderboardHeader({
  metaParts,
  pageText,
  rankRangeText,
  showdownAnswer,
}: LeaderboardHeaderProps) {
  return (
    <header className="venue-lb-header shrink-0">
      <div className="venue-lb-header-row">
        <div className="venue-lb-logo-wrap">
          <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
            <QuizzEmWordmark layout="fill" />
          </div>
        </div>

        <div className="venue-lb-header-copy min-w-0 flex-1">
          <h1 className="venue-lb-title">Leaderboard</h1>
          <div className="venue-lb-meta" aria-label={metaParts.join(', ')}>
            {metaParts.map((part, index) => (
              <Fragment key={`${part}-${index}`}>
                {index > 0 ? (
                  <span className="venue-lb-meta-sep" aria-hidden>
                    |
                  </span>
                ) : null}
                <span>{part}</span>
              </Fragment>
            ))}
          </div>
        </div>

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
      </div>
    </header>
  )
}
