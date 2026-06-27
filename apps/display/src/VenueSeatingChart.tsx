import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { buildVenueWallTileRows, seatingChartTablesFromTiles } from './venueWallModel'
import SeatingChartNameRoster from './SeatingChartNameRoster'
import { SeatingTableCard } from './SeatingTableCard'
import { seatingChartPlayerEntries, seatingChartRosterHalves } from './venueSeatingChartRoster'
import {
  SEATING_CHART_PAGE_MS,
  seatingChartPageCount,
  seatingChartPageTables,
} from './venueSeatingChartCarousel'
import { useSeatingChartPageSize } from './useSeatingChartPageSize'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'

function SeatingChartCardSlot({
  table,
}: {
  table: ReturnType<typeof seatingChartTablesFromTiles>[number]
}) {
  return (
    <div className="seating-chart-card-slot">
      <SeatingTableCard table={table} />
    </div>
  )
}

/** One centered row of up to three portrait placards. */
function SeatingChartRowPage({
  tables,
}: {
  tables: ReturnType<typeof seatingChartTablesFromTiles>
}) {
  return (
    <div className="seating-chart-card-stage" data-card-count={tables.length}>
      {tables.map((table) => (
        <SeatingChartCardSlot key={table.tableNum} table={table} />
      ))}
    </div>
  )
}

function SeatingChartPager({
  pageIndex,
  pageCount,
}: {
  pageIndex: number
  pageCount: number
}) {
  return (
    <div
      className="seating-chart-pager flex flex-col items-center gap-2.5"
      aria-live="polite"
      aria-label={`Table page ${pageIndex + 1} of ${pageCount}`}
    >
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

  const pageSize = useSeatingChartPageSize()
  const pageCount = seatingChartPageCount(tables.length, pageSize)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [tables.length, pageSize])

  useEffect(() => {
    if (pageCount <= 1) return
    const id = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % pageCount)
    }, SEATING_CHART_PAGE_MS)
    return () => window.clearInterval(id)
  }, [pageCount])

  const pageTables = useMemo(
    () => seatingChartPageTables(tables, pageIndex, pageSize),
    [tables, pageIndex, pageSize],
  )

  const rosterHalves = useMemo(() => {
    const entries = seatingChartPlayerEntries(tables)
    return seatingChartRosterHalves(entries)
  }, [tables])

  const totalSeated =
    wall?.totalSeatedAtTables ??
    tables.reduce((sum, t) => sum + t.seats.length, 0)

  if (tables.length === 0) return null

  const showPager = pageCount > 1

  return (
    <div className="seating-chart-screen fixed inset-0 overflow-hidden bg-[#050806]">
      <DisplayWelcomeBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden text-white">
        <header className="seating-chart-header shrink-0 border-b border-yellow-700/25 bg-black/35 px-6 py-3 backdrop-blur-md sm:px-8 sm:py-3.5">
          <div className="flex w-full max-w-none items-center gap-x-5 gap-y-3 sm:gap-x-6">
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

        <main className="seating-chart-main flex min-h-0 flex-1 overflow-hidden">
          <SeatingChartNameRoster title="A–M" entries={rosterHalves.am} align="left" />

          <div className="seating-chart-center flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-2 sm:px-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${pageIndex}-${pageSize}`}
                  className="flex h-full min-h-0 w-full max-h-full flex-1 items-center justify-center"
                  initial={skipMountIntro ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SeatingChartRowPage tables={pageTables} />
                </motion.div>
              </AnimatePresence>
            </div>

            {showPager ? (
              <div className="seating-chart-pager-wrap shrink-0 pb-3 pt-1 sm:pb-4">
                <SeatingChartPager pageIndex={pageIndex} pageCount={pageCount} />
              </div>
            ) : null}
          </div>

          <SeatingChartNameRoster title="N–Z" entries={rosterHalves.nz} align="right" />
        </main>
      </div>
    </div>
  )
}
