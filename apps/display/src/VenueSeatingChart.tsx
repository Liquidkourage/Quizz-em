import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { buildVenueWallTileRows, seatingChartTablesFromTiles } from './venueWallModel'
import { SeatingPlayerList, SeatingTableDiagram } from './SeatingTableFelt'
import {
  SEATING_CHART_GRID_MAX_WIDTH_REM,
  SEATING_CHART_PAGE_MS,
  seatingChartPageCount,
  seatingChartPageLabel,
  seatingChartPageTables,
  seatingChartWFormationLayout,
} from './venueSeatingChartCarousel'

function SeatingTableCard({
  table,
}: {
  table: ReturnType<typeof seatingChartTablesFromTiles>[number]
}) {
  return (
    <article
      className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-800/95 to-slate-950 shadow-[0_16px_48px_rgba(0,0,0,0.42),0_0_0_1px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(255,255,255,0.07)]"
      aria-label={`Table ${table.tableNum}, ${table.seats.length} players`}
    >
      <header className="flex shrink-0 items-center border-b border-amber-500/25 bg-gradient-to-r from-amber-500/18 via-amber-400/12 to-amber-500/18 px-5 py-2.5 sm:px-6 sm:py-3">
        <span className="text-2xl font-black tabular-nums leading-none text-amber-50 sm:text-3xl">
          {table.tableNum}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex min-h-0 items-center justify-center overflow-hidden border-b border-white/[0.06] pb-2 sm:pb-3">
          <SeatingTableDiagram occupiedSeatNums={table.seats.map((s) => s.seatNum)} />
        </div>
        <div className="flex min-h-0 flex-col justify-center overflow-hidden">
          <SeatingPlayerList seats={table.seats} />
        </div>
      </div>
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
  const pageLayout = useMemo(
    () => seatingChartWFormationLayout(pageTables.length),
    [pageTables.length],
  )
  const pageMeta = seatingChartPageLabel(pageIndex, tables.length)

  const totalSeated =
    wall?.totalSeatedAtTables ??
    tables.reduce((sum, t) => sum + t.seats.length, 0)

  if (tables.length === 0) return null

  const showPager = pageCount > 1

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c1220] to-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-[42%] h-[min(48vh,28rem)] w-[min(88vw,56rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.04] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(251,191,36,0.06),transparent_55%)]" />
      </div>

      <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-white">
        <header className="shrink-0 border-b border-yellow-700/25 bg-black/35 px-6 py-3 backdrop-blur-md sm:px-8 sm:py-3.5">
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

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-2.5">
          <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pageIndex}
                className="grid h-full min-h-0 w-full max-h-full flex-1 items-stretch gap-x-3 gap-y-3 sm:gap-x-4 sm:gap-y-4"
                style={{
                  maxWidth: `${SEATING_CHART_GRID_MAX_WIDTH_REM}rem`,
                  gridTemplateColumns: `repeat(${pageLayout.trackColumns}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${pageLayout.rowCount}, minmax(0, 1fr))`,
                }}
                initial={skipMountIntro ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {pageTables.map((table, index) => {
                  const slot = pageLayout.slots[index]
                  if (!slot) return null
                  return (
                    <div
                      key={table.tableNum}
                      className="flex h-full min-h-0 min-w-0"
                      style={{ gridColumn: slot.gridColumn, gridRow: slot.gridRow }}
                    >
                      <SeatingTableCard table={table} />
                    </div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {showPager ? (
            <div className="shrink-0 pt-2 sm:pt-2.5">
              <SeatingChartPager
                pageIndex={pageIndex}
                pageCount={pageCount}
                tableRange={pageMeta.tableRange}
                tableTotal={tables.length}
              />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
