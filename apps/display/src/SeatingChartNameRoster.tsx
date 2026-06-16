import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  SEATING_CHART_ROSTER_PAGE_MS,
  SEATING_CHART_ROSTER_PAGE_SIZE,
  seatingChartRosterPageCount,
  seatingChartRosterPageEntries,
  type SeatingChartPlayerEntry,
} from './venueSeatingChartRoster'

function splitSeatingDisplayName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

function SeatingChartRosterRow({ entry }: { entry: SeatingChartPlayerEntry }) {
  const { given, suffix } = splitSeatingDisplayName(entry.name)
  return (
    <li className="flex min-w-0 items-baseline justify-between gap-3 rounded-lg bg-white/[0.04] px-2.5 py-1.5 ring-1 ring-white/[0.06] sm:px-3 sm:py-2">
      <span className="min-w-0 truncate text-sm font-semibold leading-snug text-white sm:text-base">
        {given}
        {suffix ? <span className="font-normal text-amber-100/50"> {suffix}</span> : null}
      </span>
      <span className="shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-amber-200/75 sm:text-sm">
        T{entry.tableNum} · S{entry.seatNum}
      </span>
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
      className={`flex min-h-0 flex-1 basis-0 flex-col overflow-hidden border-white/10 px-3 py-1 sm:px-4 ${
        align === 'left' ? 'border-r' : 'border-l'
      }`}
      aria-label={`${title} player roster`}
    >
      <div
        className={`mb-2 flex shrink-0 items-end justify-between gap-2 ${
          align === 'right' ? 'flex-row-reverse text-right' : ''
        }`}
      >
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-amber-300/90 sm:text-base">
          {title}
        </h2>
        {pageCount > 1 ? (
          <p className="text-[11px] font-medium tabular-nums text-white/45 sm:text-xs">
            {rangeStart}–{rangeEnd} of {entries.length}
          </p>
        ) : (
          <p className="text-[11px] font-medium tabular-nums text-white/45 sm:text-xs">
            {entries.length} players
          </p>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={pageIndex}
            className="absolute inset-0 flex flex-col gap-1.5 sm:gap-2"
            initial={{ opacity: 0, x: align === 'left' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: align === 'left' ? 12 : -12 }}
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
          className={`mt-2 flex shrink-0 items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}
          aria-hidden
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all duration-300 ${
                i === pageIndex
                  ? 'h-1.5 w-6 bg-amber-300/85'
                  : 'h-1.5 w-1.5 bg-white/25'
              }`}
            />
          ))}
        </div>
      ) : null}
    </aside>
  )
}
