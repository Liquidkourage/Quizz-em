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

  const shuffleInMatch = formatted.match(/^Shuffle in (\d+) hands$/i)
  if (shuffleInMatch) {
    return (
      <>
        <span className="venue-lb-status-muted">Shuffle in </span>
        <span className="venue-lb-status-num">{shuffleInMatch[1]}</span>
        <span className="venue-lb-status-muted"> hands</span>
      </>
    )
  }

  if (/^Shuffle next hand$/i.test(formatted)) {
    return <span className="venue-lb-status-muted">Shuffle next hand</span>
  }

  return formatted
}

/** Remaining + shuffle countdown — sits below header metadata. */
export function LeaderboardStatusRow({ model }: { model: VenueCondenseProgressModel }) {
  const parts = venueHeadlineCondenseCaptionParts(model)
  const showTrack = model.liveTables > 1 && model.handsUntilShuffle != null

  if (model.liveTables <= 1 && parts.length <= 1) {
    return (
      <div className="venue-lb-status shrink-0" aria-live="polite">
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
      </div>
    )
  }

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
              <span
                className="venue-lb-status-diamond"
                style={{ left: `${Math.max(0, Math.min(100, model.shuffleFillPct))}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
