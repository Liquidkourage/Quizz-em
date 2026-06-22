import { Fragment } from 'react'
import type { VenueCondenseProgressModel } from './venueWallModel'
import { DISPLAY_TEXT_HEADLINE_CAPTION } from './displayTypography'

type VenueCondenseProgressBarProps = {
  model: VenueCondenseProgressModel
  /** headline = raw stats under venue headline; sidebar = stacks rail; bottom = fallback strip */
  variant?: 'headline' | 'sidebar' | 'bottom'
  /** Override caption typography (table-count tier from parent). */
  captionClass?: string
}

function formatHeadlineCondensePart(part: string): string {
  if (part.startsWith('combine at ')) {
    return `Combine at ${part.slice('combine at '.length)}`
  }
  if (part.startsWith('combining to ')) {
    return `Combining to ${part.slice('combining to '.length)}`
  }
  return part
}

function headlineCondenseCaptionParts(model: VenueCondenseProgressModel): string[] {
  const { survivors, liveTables, nextAt, nextToTables } = model
  const parts = [`${survivors} remaining`, `${liveTables} ${liveTables === 1 ? 'table' : 'tables'}`]
  if (liveTables <= 1) return parts
  if (nextAt != null && survivors > nextAt) {
    parts.push(`combine at ${nextAt}`)
  } else if (nextAt != null && nextToTables != null) {
    parts.push(`combining to ${nextToTables} tables`)
  }
  return parts
}

function headlineCondenseCaption(model: VenueCondenseProgressModel): string {
  return headlineCondenseCaptionParts(model).map(formatHeadlineCondensePart).join(' · ')
}

/** Emphasize leading numerals in stat fragments like "91 remaining" or "Combine at 74". */
function HeadlineStatPart({ part }: { part: string }) {
  const formatted = formatHeadlineCondensePart(part)
  const remainingMatch = formatted.match(/^(\d+)\s+(remaining.*)$/i)
  if (remainingMatch) {
    return (
      <>
        <span className="text-amber-100">{remainingMatch[1]}</span>
        <span className="text-white/80"> {remainingMatch[2]}</span>
      </>
    )
  }

  const tablesMatch = formatted.match(/^(\d+)\s+(tables?)$/i)
  if (tablesMatch) {
    return (
      <>
        <span className="text-amber-100">{tablesMatch[1]}</span>
        <span className="text-white/80"> {tablesMatch[2]}</span>
      </>
    )
  }

  const combineAtMatch = formatted.match(/^Combine at (\d+)$/i)
  if (combineAtMatch) {
    return (
      <>
        <span className="text-white/80">Combine at </span>
        <span className="text-amber-100">{combineAtMatch[1]}</span>
      </>
    )
  }

  const combiningToMatch = formatted.match(/^Combining to (\d+)\s+(tables?)$/i)
  if (combiningToMatch) {
    return (
      <>
        <span className="text-white/80">Combining to </span>
        <span className="text-amber-100">{combiningToMatch[1]}</span>
        <span className="text-white/80"> {combiningToMatch[2]}</span>
      </>
    )
  }

  return formatted
}

export default function VenueCondenseProgressBar({
  model,
  variant = 'bottom',
  captionClass = DISPLAY_TEXT_HEADLINE_CAPTION,
}: VenueCondenseProgressBarProps) {
  const { survivors, peakSurvivors, liveTables, fillPct, marks, nextAt } = model
  if (liveTables <= 1 && marks.length === 0) return null

  const showMarks = marks.length > 0 && liveTables > 1
  const headline = variant === 'headline'
  const sidebar = variant === 'sidebar'

  if (headline) {
    return (
      <div className="w-full border-t border-white/10 pt-1 sm:pt-1.5" aria-live="polite">
        <p
          className={`flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left font-bold tabular-nums tracking-tight ${captionClass}`}
          role="status"
          aria-label={headlineCondenseCaption(model)}
        >
          {headlineCondenseCaptionParts(model).map((part, index) => (
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
  const tickClass = 'w-px'

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
          {headlineCondenseCaption(model)}
        </p>

        <div className={`relative ${sidebar ? 'pt-2.5' : ''}`}>
          {showMarks ? (
            <div className="absolute inset-x-0 top-0 h-2.5" aria-hidden>
              {marks.map((mark) => (
                <span
                  key={`${mark.atSurvivors}-${mark.toTables}`}
                  className={`absolute bottom-0 block ${tickClass} -translate-x-1/2 rounded-full ${
                    mark.status === 'next'
                      ? 'h-3 bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.55)] sm:h-3.5'
                      : mark.status === 'passed'
                        ? 'h-1.5 bg-white/25'
                        : 'h-2 bg-white/55 sm:h-2.5'
                  }`}
                  style={{ left: `${mark.pct}%` }}
                  title={`${mark.atSurvivors} players → ${mark.toTables} tables`}
                />
              ))}
            </div>
          ) : null}

          <div className={`overflow-hidden rounded-full bg-white/10 ${trackHeight}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-violet-400/70 transition-[width] duration-500 ease-out"
              style={{ width: `${fillPct}%` }}
            />
          </div>

          {showMarks && nextAt != null && survivors > nextAt ? (
            <span
              className="absolute -top-0.5 -translate-x-1/2 font-mono text-[8px] font-bold tabular-nums text-amber-200/95"
              style={{
                left: `${marks.find((m) => m.atSurvivors === nextAt)?.pct ?? 0}%`,
              }}
              aria-hidden
            >
              {nextAt}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
