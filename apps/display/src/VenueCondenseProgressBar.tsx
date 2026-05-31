import type { VenueCondenseProgressModel } from './venueWallModel'

type VenueCondenseProgressBarProps = {
  model: VenueCondenseProgressModel
  /** Dock under the stacks crawl instead of floating over the floor. */
  variant?: 'sidebar' | 'bottom'
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
  const sidebar = variant === 'sidebar'

  return (
    <div
      className={
        sidebar
          ? 'shrink-0 border-t border-white/10 px-2 py-2 sm:px-2.5 sm:py-2.5'
          : 'pointer-events-none fixed bottom-0 left-0 right-0 z-30 px-3 pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] pt-1.5 sm:px-4'
      }
      aria-live="polite"
    >
      <div
        className={`${sidebar ? 'w-full' : 'mx-auto max-w-3xl'} rounded-md border border-white/10 bg-black/55 px-2 py-1.5 backdrop-blur-sm sm:px-2.5`}
        role="img"
        aria-label={`${survivors} of ${peakSurvivors} players remaining across ${liveTables} tables`}
      >
        <p
          className={`truncate text-center font-medium tabular-nums text-white/70 ${
            sidebar ? 'mb-1 text-[9px] leading-tight sm:text-[10px]' : 'mb-1 text-[10px] sm:text-xs'
          }`}
        >
          {compactCaption(model)}
        </p>

        <div className={`relative ${sidebar ? 'h-1.5' : 'h-2 sm:h-2.5'}`}>
          {showMarks ? (
            <div className="absolute inset-x-0 top-0 h-2" aria-hidden>
              {marks.map((mark) => (
                <span
                  key={`${mark.atSurvivors}-${mark.toTables}`}
                  className={`absolute top-0 block w-px -translate-x-1/2 ${
                    mark.status === 'next'
                      ? 'h-2 bg-amber-300/90'
                      : mark.status === 'passed'
                        ? 'h-1 bg-white/20'
                        : 'h-1.5 bg-white/45'
                  }`}
                  style={{ left: `${mark.pct}%` }}
                />
              ))}
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-violet-400/75 transition-[width] duration-500 ease-out"
              style={{ width: `${fillPct}%` }}
            />
          </div>

          {showMarks && nextAt != null && survivors > nextAt ? (
            <span
              className="absolute -top-0.5 -translate-x-1/2 font-mono text-[8px] font-bold tabular-nums text-amber-200/90"
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
