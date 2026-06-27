import { Fragment, useMemo } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import { QuizzEmWordmark } from '@qhe/ui'
import type { VenueCondenseProgressModel } from './venueWallModel'
import {
  formatVenueHeadlineCondensePart,
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
} from './venueWallModel'

export type LeaderboardHeaderProps = {
  metaParts: string[]
  condenseProgress?: VenueCondenseProgressModel | null
  pageText?: string
  rankRangeText?: string
  showdownAnswer?: number
}

function MetaSegment({ text }: { text: string }) {
  const remainingMatch = text.match(/^(\d+)\s+(remaining.*)$/i)
  if (remainingMatch) {
    return (
      <>
        <span className="venue-lb-meta-num">{remainingMatch[1]}</span>
        <span className="venue-lb-meta-muted"> {remainingMatch[2]}</span>
      </>
    )
  }

  const reseatingAtMatch = text.match(/^Re-seating at (\d+)$/i)
  if (reseatingAtMatch) {
    return (
      <>
        <span className="venue-lb-meta-muted">Re-seating at </span>
        <span className="venue-lb-meta-num">{reseatingAtMatch[1]}</span>
      </>
    )
  }

  if (/^Re-seating now$/i.test(text)) {
    return <span className="venue-lb-meta-muted">Re-seating now</span>
  }

  return text
}

/** One caption line — condense status + blinds/level (no duplicate player count). */
function buildCombinedMetaSegments(
  metaParts: string[],
  condenseProgress: VenueCondenseProgressModel | null | undefined
): string[] {
  const gameMeta = condenseProgress != null ? metaParts.slice(1) : metaParts
  if (condenseProgress == null) return gameMeta

  const condenseSegments = venueHeadlineCondenseCaptionParts(condenseProgress).map(
    formatVenueHeadlineCondensePart
  )
  return [...condenseSegments, ...gameMeta]
}

export function LeaderboardHeader({
  metaParts,
  condenseProgress = null,
  pageText,
  rankRangeText,
  showdownAnswer,
}: LeaderboardHeaderProps) {
  const combinedSegments = useMemo(
    () => buildCombinedMetaSegments(metaParts, condenseProgress),
    [metaParts, condenseProgress]
  )

  const showTrack =
    condenseProgress != null && condenseProgress.liveTables > 1 && condenseProgress.marks.length > 0
  const nextMark =
    condenseProgress?.marks.find((m) => m.atSurvivors === condenseProgress.nextAt) ??
    condenseProgress?.marks.find((m) => m.status === 'next')
  const thresholdPct = nextMark?.pct ?? null

  const statusAriaLabel =
    condenseProgress != null ? venueHeadlineCondenseCaption(condenseProgress) : undefined

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
          <div className="venue-lb-meta-band" aria-live="polite">
            <p
              className="venue-lb-meta"
              aria-label={
                statusAriaLabel != null
                  ? [statusAriaLabel, ...metaParts.slice(1)].join(', ')
                  : combinedSegments.join(', ')
              }
            >
              {combinedSegments.map((segment, index) => (
                <Fragment key={`${segment}-${index}`}>
                  {index > 0 ? (
                    <span className="venue-lb-meta-sep" aria-hidden>
                      |
                    </span>
                  ) : null}
                  <span className="whitespace-nowrap">
                    <MetaSegment text={segment} />
                  </span>
                </Fragment>
              ))}
            </p>
            {showTrack ? (
              <div className="venue-lb-meta-track-wrap" aria-hidden>
                <div className="venue-lb-meta-track">
                  {thresholdPct != null ? (
                    <span className="venue-lb-meta-diamond" style={{ left: `${thresholdPct}%` }} />
                  ) : null}
                </div>
              </div>
            ) : null}
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
