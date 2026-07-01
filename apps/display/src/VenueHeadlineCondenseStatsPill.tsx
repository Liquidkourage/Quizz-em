import { Fragment } from 'react'
import {
  formatVenueHeadlineCondensePart,
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
  type VenueCondenseProgressModel,
} from './venueWallModel'

function HeadlineStatPart({ part }: { part: string }) {
  const formatted = formatVenueHeadlineCondensePart(part)
  const remainingMatch = formatted.match(/^(\d+)\s+(remaining.*)$/i)
  if (remainingMatch) {
    return (
      <>
        <span className="text-amber-100">{remainingMatch[1]}</span>
        <span className="text-white/80"> {remainingMatch[2]}</span>
      </>
    )
  }

  const shuffleInMatch = formatted.match(/^Shuffle in (\d+) hands$/i)
  if (shuffleInMatch) {
    return (
      <>
        <span className="text-white/80">Shuffle in </span>
        <span className="text-amber-100">{shuffleInMatch[1]}</span>
        <span className="text-white/80"> hands</span>
      </>
    )
  }

  if (/^Shuffle next hand$/i.test(formatted)) {
    return <span className="text-white/80">Shuffle next hand</span>
  }

  return formatted
}

export default function VenueHeadlineCondenseStatsPill({
  model,
  className = '',
}: {
  model: VenueCondenseProgressModel
  className?: string
}) {
  const parts = venueHeadlineCondenseCaptionParts(model)
  if (parts.length === 0) return null

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border border-slate-400/40 bg-slate-950/60 px-2 py-0.5 font-bold tabular-nums tracking-tight text-white/95 sm:px-2.5 sm:py-1 ${className}`}
      role="status"
      aria-label={venueHeadlineCondenseCaption(model)}
    >
      {parts.map((part, index) => (
        <Fragment key={part}>
          {index > 0 ? (
            <span className="shrink-0 px-1 text-white/45" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="shrink-0 whitespace-nowrap">
            <HeadlineStatPart part={part} />
          </span>
        </Fragment>
      ))}
    </span>
  )
}
