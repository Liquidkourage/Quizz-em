import { Fragment } from 'react'
import type { VenueCondenseProgressModel } from './venueWallModel'
import { DISPLAY_TEXT_HEADLINE_CAPTION, DISPLAY_TEXT_HEADLINE_META } from './displayTypography'

type VenueCondenseProgressBarProps = {
  model: VenueCondenseProgressModel
  /** headline = full-width under venue headline; sidebar = stacks rail; bottom = fallback strip */
  variant?: 'headline' | 'sidebar' | 'bottom'
  /** Override caption typography (table-count tier from parent). */
  captionClass?: string
  /** Leaderboard-style callout above the next-combine marker. */
  showCombineCallout?: boolean
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

function compactCaption(model: VenueCondenseProgressModel): string {
  return headlineCondenseCaption(model)
}

export default function VenueCondenseProgressBar({
  model,
  variant = 'bottom',
  captionClass = DISPLAY_TEXT_HEADLINE_CAPTION,
  showCombineCallout = false,
}: VenueCondenseProgressBarProps) {
  const { survivors, peakSurvivors, liveTables, fillPct, marks, nextAt } = model
  if (liveTables <= 1 && marks.length === 0) return null

  const showMarks = marks.length > 0 && liveTables > 1
  const headline = variant === 'headline'
  const sidebar = variant === 'sidebar'

  const trackHeight = headline ? 'h-2.5 sm:h-3' : sidebar ? 'h-2' : 'h-2 sm:h-2.5'
  const tickClass = headline ? 'w-0.5' : 'w-px'

  return (
    <div
      className={
        headline
          ? 'w-full border-t border-white/10 pt-0.5'
          : sidebar
            ? 'w-full'
            : 'pointer-events-none fixed bottom-0 left-0 right-0 z-30 px-3 pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] pt-1.5 sm:px-4'
      }
      aria-live="polite"
    >
      <div
        className={`w-full ${headline || sidebar ? '' : 'mx-auto max-w-3xl rounded-md border border-white/10 bg-black/55 px-2 py-1.5 backdrop-blur-sm sm:px-2.5'}`}
        role="img"
        aria-label={`${survivors} of ${peakSurvivors} players remaining across ${liveTables} tables`}
      >
        {headline ? (
          <p
            className={`mb-1 flex min-w-0 items-center truncate text-left font-semibold tabular-nums text-white/85 ${captionClass}`}
          >
            {headlineCondenseCaptionParts(model).map((part, index) => (
              <Fragment key={part}>
                {index > 0 ? (
                  <span className="shrink-0 px-1.5 text-white/40" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className="shrink-0">{formatHeadlineCondensePart(part)}</span>
              </Fragment>
            ))}
          </p>
        ) : (
          <p
            className={`truncate font-semibold tabular-nums text-white/80 ${
              sidebar
                ? 'mb-1 text-center text-[10px] leading-tight sm:text-[11px]'
                : 'mb-1 text-center text-[clamp(0.9rem,2.2vw,1.125rem)] leading-tight'
            }`}
          >
            {compactCaption(model)}
          </p>
        )}

        <div className={`relative ${headline ? 'pb-0 pt-1.5' : sidebar ? 'pt-2.5' : ''}`}>
          {showMarks ? (
            <div className={`absolute inset-x-0 top-0 ${headline ? 'h-3' : 'h-2.5'}`} aria-hidden>
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

          <div
            className={`overflow-hidden rounded-full bg-white/10 ${trackHeight}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-violet-400/70 transition-[width] duration-500 ease-out"
              style={{ width: `${fillPct}%` }}
            />
          </div>

          {showMarks && nextAt != null && survivors > nextAt ? (
            showCombineCallout && headline ? (
              <div
                className="absolute bottom-full z-10 mb-1 -translate-x-1/2"
                style={{
                  left: `${marks.find((m) => m.atSurvivors === nextAt)?.pct ?? 0}%`,
                }}
              >
                <div className="whitespace-nowrap rounded-md border border-violet-400/45 bg-violet-950/95 px-2.5 py-1 text-center shadow-[0_4px_16px_rgba(0,0,0,0.45)]">
                  <p className="text-[10px] font-black uppercase leading-none tracking-[0.14em] text-violet-200/90 sm:text-[11px]">
                    Next combine
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold tabular-nums leading-none text-amber-200 sm:text-base">
                    {nextAt} players
                  </p>
                </div>
              </div>
            ) : (
              <span
                className={`absolute -translate-x-1/2 font-mono font-bold tabular-nums text-amber-200/95 ${
                  headline ? `-top-0.5 ${DISPLAY_TEXT_HEADLINE_META}` : '-top-0.5 text-[8px]'
                }`}
                style={{
                  left: `${marks.find((m) => m.atSurvivors === nextAt)?.pct ?? 0}%`,
                }}
                aria-hidden
              >
                {nextAt}
              </span>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}
