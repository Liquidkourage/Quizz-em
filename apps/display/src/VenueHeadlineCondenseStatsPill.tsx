import { Fragment } from 'react'
import {
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
  type VenueCondenseProgressModel,
} from './venueWallModel'
import { VenueHeadlineMetaPart } from './VenueHeadlineMetaPart'

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
            <VenueHeadlineMetaPart part={part} />
          </span>
        </Fragment>
      ))}
    </span>
  )
}
