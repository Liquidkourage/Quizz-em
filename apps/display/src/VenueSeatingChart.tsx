import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { buildVenueWallTileRows, seatingChartTablesFromTiles } from './venueWallModel'
import {
  SEATING_CHART_CARD_MAX_WIDTH_REM,
  SEATING_CHART_GRID_MAX_WIDTH_REM,
  SEATING_CHART_PAGE_MS,
  seatingChartPageCount,
  seatingChartPageGrid,
  seatingChartPageLabel,
  seatingChartPageTables,
} from './venueSeatingChartCarousel'

/** "Alice C." → given name + surname initial for two-tone rendering. */
function splitSeatingDisplayName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

function SeatingPlayerName({ name }: { name: string }) {
  const { given, suffix } = splitSeatingDisplayName(name)
  return (
    <span className="min-w-0 flex-1 truncate text-lg font-medium leading-snug sm:text-xl">
      <span className="font-semibold text-white">{given}</span>
      {suffix ? <span className="font-normal text-amber-100/50"> {suffix}</span> : null}
    </span>
  )
}

function SeatingTableCard({
  table,
}: {
  table: ReturnType<typeof seatingChartTablesFromTiles>[number]
}) {
  const seatRows = Math.ceil(table.seats.length / 2)

  return (
    <article
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-800/95 to-slate-950 shadow-[0_16px_48px_rgba(0,0,0,0.42),0_0_0_1px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(255,255,255,0.07)]"
      style={{ maxWidth: `${SEATING_CHART_CARD_MAX_WIDTH_REM}rem` }}
      aria-label={`Table ${table.tableNum}, ${table.seats.length} players`}
    >
      <header className="border-b border-amber-500/25 bg-gradient-to-r from-amber-500/18 via-amber-400/12 to-amber-500/18 px-5 py-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/75 sm:text-xs">
          Table
        </p>
        <p className="mt-0.5 text-3xl font-black tabular-nums leading-none text-amber-50 sm:text-4xl">
          {table.tableNum}
        </p>
      </header>

      <ul
        className="grid gap-x-3 gap-y-2 p-4 sm:gap-y-2.5 sm:p-5"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gridTemplateRows: `repeat(${seatRows}, auto)`,
          gridAutoFlow: 'column',
        }}
      >
        {table.seats.map((seat) => (
          <li
            key={seat.seatNum}
            className="flex min-w-0 items-center gap-3 rounded-xl bg-white/[0.045] px-3 py-2.5 ring-1 ring-white/[0.07] sm:px-3.5 sm:py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-amber-900/90 to-amber-950 font-mono text-sm font-black tabular-nums text-amber-100 shadow-inner ring-1 ring-amber-400/35 sm:h-10 sm:w-10 sm:text-base">
              {seat.seatNum}
            </span>
            <SeatingPlayerName name={seat.name} />
          </li>
        ))}
      </ul>
    </article>
  )
}

function SeatingChartPager({
  pageIndex,
  pageCount,
  tableRange,
  tableTotal,
}: {
  pageIndex: number
  pageCount: number
  tableRange: string
  tableTotal: number
}) {
  return (
    <div className="flex flex-col items-center gap-2.5" aria-live="polite">
      <p className="text-sm font-medium tabular-nums text-white/60 sm:text-base">
        Tables {tableRange} of {tableTotal}
      </p>
      <div className="flex items-center gap-2.5" aria-hidden>
        {Array.from({ length: pageCount }, (_, i) => (
          <span
            key={i}
            className={`block rounded-full transition-all duration-300 ${
              i === pageIndex
                ? 'h-2 w-9 bg-amber-300/90 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : 'h-2 w-2 bg-white/25'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export type VenueSeatingChartProps = {
  wall: DisplayVenueWallSnapshot | null
  skipMountIntro?: boolean
}

export default function VenueSeatingChart({ wall, skipMountIntro = false }: VenueSeatingChartProps) {
  const tables = useMemo(() => {
    const rows = buildVenueWallTileRows(wall)
    return seatingChartTablesFromTiles(rows)
  }, [wall])

  const pageCount = seatingChartPageCount(tables.length)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [tables.length])

  useEffect(() => {
    if (pageCount <= 1) return
    const id = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % pageCount)
    }, SEATING_CHART_PAGE_MS)
    return () => window.clearInterval(id)
  }, [pageCount])

  const pageTables = useMemo(
    () => seatingChartPageTables(tables, pageIndex),
    [tables, pageIndex],
  )
  const pageGrid = useMemo(() => seatingChartPageGrid(pageTables.length), [pageTables.length])
  const pageMeta = seatingChartPageLabel(pageIndex, tables.length)

  const totalSeated =
    wall?.totalSeatedAtTables ??
    tables.reduce((sum, t) => sum + t.seats.length, 0)

  if (tables.length === 0) return null

  const showPager = pageCount > 1

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c1220] to-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-[42%] h-[min(48vh,28rem)] w-[min(72vw,44rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.04] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(251,191,36,0.06),transparent_55%)]" />
      </div>

      <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-white">
        <header className="shrink-0 border-b border-yellow-700/25 bg-black/35 px-6 py-4 backdrop-blur-md sm:px-8 sm:py-5">
          <div
            className="mx-auto flex w-full items-center gap-x-5 gap-y-3 sm:gap-x-6"
            style={{ maxWidth: `${SEATING_CHART_GRID_MAX_WIDTH_REM}rem` }}
          >
            <div className="w-[clamp(5.5rem,min(14vw,8rem),9rem)] shrink-0">
              <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
                <QuizzEmWordmark layout="fill" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black tracking-tight text-yellow-300 sm:text-3xl">
                Seating assignments
              </h1>
              <p className="mt-0.5 text-sm text-white/65 sm:text-base">
                <span className="font-semibold tabular-nums text-amber-200/90">{totalSeated}</span> players
                across{' '}
                <span className="font-semibold tabular-nums text-amber-200/90">{tables.length}</span> tables
                {' · '}
                waiting for the host to start the round
              </p>
            </div>
          </div>
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6 py-6 sm:gap-10 sm:px-8 sm:py-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pageIndex}
              className="grid w-full justify-items-center gap-x-8 gap-y-6 sm:gap-x-10 sm:gap-y-8"
              style={{
                maxWidth: `${SEATING_CHART_GRID_MAX_WIDTH_REM}rem`,
                gridTemplateColumns: `repeat(${pageGrid.columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${pageGrid.rowCount}, auto)`,
              }}
              initial={skipMountIntro ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {pageTables.map((table) => (
                <SeatingTableCard key={table.tableNum} table={table} />
              ))}
            </motion.div>
          </AnimatePresence>

          {showPager ? (
            <SeatingChartPager
              pageIndex={pageIndex}
              pageCount={pageCount}
              tableRange={pageMeta.tableRange}
              tableTotal={tables.length}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}
