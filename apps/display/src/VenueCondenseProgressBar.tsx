import { Fragment } from 'react'
import type { VenueCondenseProgressModel } from './venueWallModel'
import {
  formatVenueHeadlineCondensePart,
  venueHeadlineCondenseCaption,
  venueHeadlineCondenseCaptionParts,
} from './venueWallModel'
import { DISPLAY_TEXT_HEADLINE_CAPTION } from './displayTypography'

type VenueCondenseProgressBarProps = {
  model: VenueCondenseProgressModel
  /** headline = raw stats line; sidebar = stacks rail; bottom = fallback strip */
  variant?: 'headline' | 'sidebar' | 'bottom'
  /** Override caption typography (table-count tier from parent). */
  captionClass?: string
}

/** Emphasize leading numerals in stat fragments like "91 remaining" or "Shuffle in 3 hands". */
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

export default function VenueCondenseProgressBar({
  model,
  variant = 'bottom',
  captionClass = DISPLAY_TEXT_HEADLINE_CAPTION,
}: VenueCondenseProgressBarProps) {
  const { survivors, peakSurvivors, liveTables, fillPct, shuffleFillPct, handsUntilShuffle } = model
  if (liveTables <= 1 && handsUntilShuffle == null) return null

  const headline = variant === 'headline'
  const sidebar = variant === 'sidebar'
  const trackPct = handsUntilShuffle != null ? shuffleFillPct : fillPct

  if (headline) {
    return (
      <div className="w-full border-t border-white/10 pt-1 sm:pt-1.5" aria-live="polite">
        <p
          className={`flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left font-bold tabular-nums tracking-tight ${captionClass}`}
          role="status"
          aria-label={venueHeadlineCondenseCaption(model)}
        >
          {venueHeadlineCondenseCaptionParts(model).map((part, index) => (
            <Fragment key={part}>
              {index > 0 ? (
                <span className="shrink-0 text-white/45" aria-hidden>
                  ·
                </span>
              ) : null}
              <span className="shrink-0 whitespace-nowrap">
                <HeadlineStatPart part={part} />
              </span>
            </Fragment>
          ))}
        </p>
      </div>
    )
  }

  const trackHeight = sidebar ? 'h-2' : 'h-2 sm:h-2.5'

  return (
    <div
      className={
        sidebar
          ? 'w-full'
          : 'pointer-events-none fixed bottom-0 left-0 right-0 z-30 px-3 pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] pt-1.5 sm:px-4'
      }
      aria-live="polite"
    >
      <div
        className={`w-full ${sidebar ? '' : 'mx-auto max-w-3xl rounded-md border border-white/10 bg-black/55 px-2 py-1.5 backdrop-blur-sm sm:px-2.5'}`}
        role="img"
        aria-label={`${survivors} of ${peakSurvivors} players remaining across ${liveTables} tables`}
      >
        <p
          className={`truncate font-semibold tabular-nums text-white/80 ${
            sidebar
              ? 'mb-1 text-center text-[10px] leading-tight sm:text-[11px]'
              : 'mb-1 text-center text-[clamp(0.9rem,2.2vw,1.125rem)] leading-tight'
          }`}
        >
          {venueHeadlineCondenseCaption(model)}
        </p>

        <div className={`relative ${sidebar ? '' : ''}`}>
          <div className={`overflow-hidden rounded-full bg-white/10 ${trackHeight}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-violet-400/70 transition-[width] duration-500 ease-out"
              style={{ width: `${trackPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
