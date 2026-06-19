import type { VenueCondenseProgressModel } from './venueWallModel'
import { DISPLAY_TEXT_HEADLINE_CAPTION, DISPLAY_TEXT_HEADLINE_META } from './displayTypography'

type VenueCondenseProgressBarProps = {
  model: VenueCondenseProgressModel
  /** headline = full-width under venue headline; sidebar = stacks rail; bottom = fallback strip */
  variant?: 'headline' | 'sidebar' | 'bottom'
}

function compactCaption(model: VenueCondenseProgressModel): string {
  const { survivors, liveTables, nextAt, nextToTables } = model
  const parts = [`${survivors} remaining`, `${liveTables} ${liveTables === 1 ? 'table' : 'tables'}`]
  if (liveTables <= 1) return parts.join(' · ')
  if (nextAt != null && survivors > nextAt) {
    parts.push(`combine at ${nextAt}`)
  } else if (nextAt != null && nextToTables != null) {
    parts.push(`combining to ${nextToTables} tables`)
  }
  return parts.join(' · ')
}

export default function VenueCondenseProgressBar({
  model,
  variant = 'bottom',
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
          ? 'w-full border-t border-white/10 pt-1'
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
        <p
          className={`truncate font-semibold tabular-nums text-white/80 ${
            headline
              ? `mb-1 text-left ${DISPLAY_TEXT_HEADLINE_CAPTION}`
              : sidebar
                ? 'mb-1 text-center text-[10px] leading-tight sm:text-[11px]'
                : 'mb-1 text-center text-[clamp(0.9rem,2.2vw,1.125rem)] leading-tight'
          }`}
        >
          {compactCaption(model)}
        </p>

        <div className={`relative ${headline ? 'pb-0 pt-2.5' : sidebar ? 'pt-2.5' : ''}`}>
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
          ) : null}
        </div>
      </div>
    </div>
  )
}
