import { motion } from 'framer-motion'
import type { VenueCondenseProgressModel } from './venueWallModel'

type VenueCondenseProgressBarProps = {
  model: VenueCondenseProgressModel
  skipMountIntro?: boolean
}

export default function VenueCondenseProgressBar({
  model,
  skipMountIntro = false,
}: VenueCondenseProgressBarProps) {
  const { survivors, peakSurvivors, liveTables, fillPct, marks, primary, secondary } = model
  const showMarks = marks.length > 0 && liveTables > 1

  return (
    <motion.div
      className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-violet-500/40 bg-violet-950/35 px-3 py-2.5 shadow-[0_0_16px_rgba(139,92,246,0.08)] backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3"
      initial={skipMountIntro ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center">
        <span className="text-sm font-bold tracking-tight text-violet-100 sm:text-base md:text-lg">
          {primary}
        </span>
        {secondary ? (
          <span className="text-xs font-medium text-violet-200/70 sm:text-sm">{secondary}</span>
        ) : null}
      </div>

      <div
        className="mx-auto w-full max-w-4xl"
        role="img"
        aria-label={`${survivors} of ${peakSurvivors} players remaining across ${liveTables} tables`}
      >
        <div className="mb-1 flex items-end justify-between gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200/55 sm:text-xs">
          <span className="tabular-nums text-violet-100/85">{peakSurvivors} players</span>
          <span className="tabular-nums text-violet-100/85">Final table</span>
        </div>

        <div className="relative pt-1 pb-7 sm:pb-8">
          {showMarks ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-4" aria-hidden>
              {marks.map((mark) => (
                <div
                  key={`${mark.atSurvivors}-${mark.toTables}`}
                  className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${mark.pct}%` }}
                >
                  <span
                    className={`mb-0.5 block h-2.5 w-0.5 rounded-full sm:h-3 ${
                      mark.status === 'next'
                        ? 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.65)]'
                        : mark.status === 'passed'
                          ? 'bg-violet-400/35'
                          : 'bg-violet-200/75'
                    }`}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="relative h-3.5 overflow-hidden rounded-full border border-violet-400/25 bg-black/45 shadow-[inset_0_1px_4px_rgba(0,0,0,0.55)] sm:h-4">
            <div
              className="pointer-events-none absolute -left-1 top-1/2 z-10 h-5 w-5 -translate-y-1/2 rounded-full border border-violet-300/35 bg-gradient-to-br from-violet-400/80 to-fuchsia-500/70 shadow-[0_0_10px_rgba(167,139,250,0.4)] sm:-left-1.5 sm:h-6 sm:w-6"
              aria-hidden
            />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 via-violet-400 to-fuchsia-400 shadow-[0_0_14px_rgba(167,139,250,0.35)]"
              initial={false}
              animate={{ width: `${fillPct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.45)]"
              style={{ left: `${fillPct}%` }}
              aria-hidden
            />
          </div>

          {showMarks ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 sm:h-8" aria-hidden>
              {marks.map((mark) => (
                <div
                  key={`label-${mark.atSurvivors}-${mark.toTables}`}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${mark.pct}%` }}
                >
                  <span
                    className={`whitespace-nowrap font-mono text-[9px] font-bold tabular-nums leading-none sm:text-[10px] ${
                      mark.status === 'next'
                        ? 'text-amber-200'
                        : mark.status === 'passed'
                          ? 'text-violet-300/40'
                          : 'text-violet-200/80'
                    }`}
                  >
                    {mark.atSurvivors}
                  </span>
                  <span
                    className={`mt-0.5 whitespace-nowrap text-[8px] font-semibold leading-none sm:text-[9px] ${
                      mark.status === 'next'
                        ? 'text-amber-200/75'
                        : mark.status === 'passed'
                          ? 'text-violet-300/30'
                          : 'text-violet-200/55'
                    }`}
                  >
                    →{mark.toTables}t
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-black tabular-nums tracking-tight text-violet-50 sm:text-2xl md:text-3xl">
              {survivors}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-200/60 sm:text-xs">
              remaining
            </span>
          </div>
          <div className="text-right text-[10px] font-semibold uppercase tracking-wide text-violet-200/60 sm:text-xs">
            {liveTables} {liveTables === 1 ? 'table' : 'tables'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
