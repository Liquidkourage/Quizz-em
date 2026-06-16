import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  SEATING_CHART_ROSTER_PAGE_MS,
  SEATING_CHART_ROSTER_PAGE_SIZE,
  SEATING_CHART_ROSTER_WIDTH_REM,
  seatingChartRosterPageCount,
  seatingChartRosterPageEntries,
  type SeatingChartPlayerEntry,
} from './venueSeatingChartRoster'

function SeatingChartRosterRow({ entry }: { entry: SeatingChartPlayerEntry }) {
  return (
    <li className="min-w-0 border-b border-white/[0.07] py-[0.2rem] last:border-b-0">
      <p className="truncate text-xs font-semibold leading-tight text-white sm:text-[0.8125rem]">
        {entry.name.trim()}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-medium leading-none text-amber-200/75 sm:text-[11px]">
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
    [entries, pageIndex]
  )

  if (entries.length === 0) return null

  const rangeStart = pageIndex * SEATING_CHART_ROSTER_PAGE_SIZE + 1
  const rangeEnd = Math.min((pageIndex + 1) * SEATING_CHART_ROSTER_PAGE_SIZE, entries.length)

  return (
    <aside
      className={`flex min-h-0 shrink-0 flex-col overflow-hidden border-white/10 py-1 ${
        align === 'left' ? 'border-r pr-2 pl-3 sm:pl-4' : 'border-l pl-2 pr-3 sm:pr-4'
      }`}
      style={{ width: `${SEATING_CHART_ROSTER_WIDTH_REM}rem` }}
      aria-label={`${title} player roster`}
    >
      <div
        className={`mb-1 flex shrink-0 items-end justify-between gap-1.5 ${
          align === 'right' ? 'flex-row-reverse text-right' : ''
        }`}
      >
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-amber-300/90 sm:text-sm">
          {title}
        </h2>
        {pageCount > 1 ? (
          <p className="text-[10px] font-medium tabular-nums text-white/45 sm:text-[11px]">
            {rangeStart}–{rangeEnd} of {entries.length}
          </p>
        ) : (
          <p className="text-[10px] font-medium tabular-nums text-white/45 sm:text-[11px]">
            {entries.length} players
          </p>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={pageIndex}
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0, x: align === 'left' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: align === 'left' ? 10 : -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {pageEntries.map((entry) => (
              <SeatingChartRosterRow key={`${entry.tableNum}-${entry.seatNum}-${entry.name}`} entry={entry} />
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
                i === pageIndex
                  ? 'h-1 w-5 bg-amber-300/85'
                  : 'h-1 w-1 bg-white/25'
              }`}
            />
          ))}
        </div>
      ) : null}
    </aside>
  )
}
