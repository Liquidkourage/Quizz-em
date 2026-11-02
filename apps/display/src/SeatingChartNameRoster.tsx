import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  SEATING_CHART_ROSTER_CAPTION_FONT,
  SEATING_CHART_ROSTER_NAME_FONT,
  SEATING_CHART_ROSTER_PAGE_MS,
  seatingChartRosterPageCount,
  seatingChartRosterPageEntries,
  type SeatingChartPlayerEntry,
} from './venueSeatingChartRoster'
import { usePagingCountdown } from './useSeatingChartPaging'

/** Ring that drains once per page, then the next page appears. */
export function SeatingChartPageClock({
  durationMs,
  cycleKey,
  sizeClass,
}: {
  durationMs: number
  cycleKey: number
  sizeClass: string
}) {
  return (
    <span className={`seating-chart-clock ${sizeClass}`} aria-hidden>
      <svg viewBox="0 0 36 36" key={cycleKey}>
        <circle className="seating-chart-clock-track" cx="18" cy="18" r="15" />
        <circle
          className="seating-chart-clock-value"
          cx="18"
          cy="18"
          r="15"
          pathLength={100}
          style={{ animationDuration: `${durationMs}ms` }}
        />
      </svg>
    </span>
  )
}

function SeatingChartRosterRow({ entry }: { entry: SeatingChartPlayerEntry }) {
  return (
    <li className="seating-chart-sidebar-row flex min-h-0 flex-1 flex-col justify-center py-1">
      <p
        className="truncate font-semibold leading-tight text-white/92"
        style={{ fontSize: SEATING_CHART_ROSTER_NAME_FONT }}
      >
        {entry.name.trim()}
      </p>
      <p
        className="mt-0.5 truncate font-medium leading-tight text-amber-200/75"
        style={{ fontSize: SEATING_CHART_ROSTER_CAPTION_FONT }}
      >
        Table {entry.tableNum}, Seat {entry.seatNum}
      </p>
    </li>
  )
}

export default function SeatingChartNameRoster({
  title,
  entries,
  align = 'left',
}: {
  title: string
  entries: SeatingChartPlayerEntry[]
  align?: 'left' | 'right'
}) {
  const pageCount = seatingChartRosterPageCount(entries.length)
  const pageIndex = usePagingCountdown(pageCount, SEATING_CHART_ROSTER_PAGE_MS, entries.length)

  const pageEntries = useMemo(
    () => seatingChartRosterPageEntries(entries, pageIndex),
    [entries, pageIndex],
  )

  if (entries.length === 0) return null

  return (
    <aside
      className={`seating-chart-sidebar flex min-h-0 shrink-0 flex-col overflow-hidden ${
        align === 'left' ? 'seating-chart-sidebar--left' : 'seating-chart-sidebar--right'
      }`}
      aria-label={`${title} player roster`}
    >
      <h2
        className={`seating-chart-sidebar-title shrink-0 ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
      >
        {title}
      </h2>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={pageIndex}
            className="flex h-full min-h-0 flex-col overflow-hidden"
            initial={{ opacity: 0, x: align === 'left' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: align === 'left' ? 10 : -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {pageEntries.map((entry) => (
              <SeatingChartRosterRow
                key={`${pageIndex}-${entry.tableNum}-${entry.seatNum}-${entry.name}`}
                entry={entry}
              />
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>

      {pageCount > 1 ? (
        <div
          className={`mt-1 flex shrink-0 items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}
        >
          <SeatingChartPageClock
            durationMs={SEATING_CHART_ROSTER_PAGE_MS}
            cycleKey={pageIndex}
            sizeClass="seating-chart-clock--roster"
          />
          <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`} aria-hidden>
            {Array.from({ length: pageCount }, (_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all duration-300 ${
                  i === pageIndex ? 'h-1 w-5 bg-amber-300/70' : 'h-1 w-1 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
