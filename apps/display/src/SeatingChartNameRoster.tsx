import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  SEATING_CHART_ROSTER_PAGE_MS,
  seatingChartRosterPageCount,
  seatingChartRosterPageEntries,
  type SeatingChartPlayerEntry,
} from './venueSeatingChartRoster'

function SeatingChartRosterRow({ entry }: { entry: SeatingChartPlayerEntry }) {
  return (
    <li className="seating-chart-sidebar-row flex min-h-0 shrink-0 flex-col justify-center py-1">
      <p className="truncate text-sm font-semibold leading-tight text-white/92">
        {entry.name.trim()}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium leading-none text-amber-200/55">
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
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [entries.length])

  useEffect(() => {
    if (pageCount <= 1) return
    const id = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % pageCount)
    }, SEATING_CHART_ROSTER_PAGE_MS)
    return () => window.clearInterval(id)
  }, [pageCount])

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
          className={`mt-1 flex shrink-0 items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}
          aria-hidden
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all duration-300 ${
                i === pageIndex ? 'h-1 w-5 bg-amber-300/70' : 'h-1 w-1 bg-white/20'
              }`}
            />
          ))}
        </div>
      ) : null}
    </aside>
  )
}
