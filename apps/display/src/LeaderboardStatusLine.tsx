import { Fragment } from 'react'
import type { VenueCondenseProgressModel } from './venueWallModel'
import {
  formatVenueHeadlineCondensePart,
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
} from './venueWallModel'

function StatusPart({ part }: { part: string }) {
  const formatted = formatVenueHeadlineCondensePart(part)
  const remainingMatch = formatted.match(/^(\d+)\s+(remaining.*)$/i)
  if (remainingMatch) {
    return (
      <>
        <span className="venue-lb-status-num">{remainingMatch[1]}</span>
        <span className="venue-lb-status-muted"> {remainingMatch[2]}</span>
      </>
    )
  }

  const reseatingAtMatch = formatted.match(/^Re-seating at (\d+)$/i)
  if (reseatingAtMatch) {
    return (
      <>
        <span className="venue-lb-status-muted">Re-seating at </span>
        <span className="venue-lb-status-num">{reseatingAtMatch[1]}</span>
      </>
    )
  }

  if (/^Re-seating now$/i.test(formatted)) {
    return <span className="venue-lb-status-muted">Re-seating now</span>
  }

  return formatted
}

/** Remaining / re-seating caption with gold threshold track — leaderboard variant. */
export function LeaderboardStatusLine({ model }: { model: VenueCondenseProgressModel }) {
  const parts = venueHeadlineCondenseCaptionParts(model)
  const showTrack = model.liveTables > 1 && model.marks.length > 0
  const nextMark =
    model.marks.find((m) => m.atSurvivors === model.nextAt) ?? model.marks.find((m) => m.status === 'next')
  const thresholdPct = nextMark?.pct ?? null

  return (
    <div className="venue-lb-status shrink-0" aria-live="polite">
      <div className="venue-lb-status-row">
        <p className="venue-lb-status-caption" role="status" aria-label={venueHeadlineCondenseCaption(model)}>
          {parts.map((part, index) => (
            <Fragment key={part}>
              {index > 0 ? (
                <span className="venue-lb-status-dot" aria-hidden>
                  ·
                </span>
              ) : null}
              <span className="whitespace-nowrap">
                <StatusPart part={part} />
              </span>
            </Fragment>
          ))}
        </p>
        {showTrack ? (
          <div className="venue-lb-status-track-wrap" aria-hidden>
            <div className="venue-lb-status-track">
              {thresholdPct != null ? (
                <span className="venue-lb-status-diamond" style={{ left: `${thresholdPct}%` }} />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
