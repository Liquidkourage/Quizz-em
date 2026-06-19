import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { buildVenueWallTileRows, seatingChartTablesFromTiles } from './venueWallModel'
import SeatingChartNameRoster from './SeatingChartNameRoster'
import { seatingChartPlayerEntries, seatingChartRosterHalves } from './venueSeatingChartRoster'
import { SeatingPlayerList, SeatingTableDiagram } from './SeatingTableFelt'
import {
  SEATING_CHART_CARD_WIDTH_CSS,
  SEATING_CHART_FRAME_WIDTH_CSS,
  SEATING_CHART_GAP_X_REM,
  SEATING_CHART_PAGE_MS,
  seatingChartPageCount,
  seatingChartPageLabel,
  seatingChartPageTables,
  seatingChartWBottomLeftCss,
  seatingChartWFormationRows,
} from './venueSeatingChartCarousel'

function SeatingTableCard({
  table,
}: {
  table: ReturnType<typeof seatingChartTablesFromTiles>[number]
}) {
  return (
    <article
      className="@container flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-800/95 to-slate-950 shadow-[0_16px_48px_rgba(0,0,0,0.42),0_0_0_1px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(255,255,255,0.07)]"
      aria-label={`Table ${table.tableNum}, ${table.seats.length} players`}
    >
      <header className="flex shrink-0 items-center border-b border-amber-500/25 bg-gradient-to-r from-amber-500/18 via-amber-400/12 to-amber-500/18 px-4 py-2 sm:px-5 sm:py-2.5">
        <span className="text-xl font-black tabular-nums leading-none text-amber-50 sm:text-2xl">
          {table.tableNum}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5">
        <div className="flex h-[clamp(5.5rem,24cqh,9.5rem)] shrink-0 items-center justify-center overflow-hidden border-b border-white/[0.06] pb-2">
          <SeatingTableDiagram occupiedSeatNums={table.seats.map((s) => s.seatNum)} />
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          <SeatingPlayerList seats={table.seats} />
        </div>
      </div>
    </article>
  )
}

function SeatingChartCardSlot({ table }: { table: ReturnType<typeof seatingChartTablesFromTiles>[number] }) {
  return (
    <div
      className="flex h-full min-h-[11rem] min-w-0 shrink-0"
      style={{ width: SEATING_CHART_CARD_WIDTH_CSS }}
    >
      <SeatingTableCard table={table} />
    </div>
  )
}

function SeatingChartWPage({
  tables,
}: {
  tables: ReturnType<typeof seatingChartTablesFromTiles>
}) {
  const { topIndices, bottomIndices } = seatingChartWFormationRows(tables.length)
  const gapX = `${SEATING_CHART_GAP_X_REM}rem`
  const topRowFull = topIndices.length >= 3

  return (
    <div className="flex h-full min-h-0 w-full max-h-full flex-1 flex-col items-center">
      <div
        className="mx-auto flex h-full min-h-0 w-full max-w-full flex-col gap-y-3 sm:gap-y-4"
        style={{
          width: SEATING_CHART_FRAME_WIDTH_CSS,
        }}
      >
        <div
          className={`flex min-h-0 flex-1 items-stretch ${topRowFull ? 'justify-between' : 'justify-center'}`}
          style={topRowFull ? undefined : { gap: gapX }}
        >
          {topIndices.map((index) => (
            <SeatingChartCardSlot key={tables[index]!.tableNum} table={tables[index]!} />
          ))}
        </div>
        {bottomIndices.length > 0 ? (
          <div className="relative min-h-0 flex-1">
            {bottomIndices.map((index, bottomSlot) => (
              <div
                key={tables[index]!.tableNum}
                className="absolute top-0 flex h-full min-h-0"
                style={{
                  left: seatingChartWBottomLeftCss(bottomSlot, bottomIndices.length),
                  width: SEATING_CHART_CARD_WIDTH_CSS,
                }}
              >
                <SeatingTableCard table={tables[index]!} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
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
  const pageMeta = seatingChartPageLabel(pageIndex, tables.length)

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
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c1220] to-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-[42%] h-[min(48vh,28rem)] w-[min(88vw,56rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.04] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(251,191,36,0.06),transparent_55%)]" />
      </div>

      <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-white">
        <header className="shrink-0 border-b border-yellow-700/25 bg-black/35 px-6 py-3 backdrop-blur-md sm:px-8 sm:py-3.5">
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

        <main className="flex min-h-0 flex-1 overflow-hidden pb-3 pt-2 sm:pb-4 sm:pt-2.5">
          <SeatingChartNameRoster title="A–M" entries={rosterHalves.am} align="left" />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 sm:px-3">
            <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pageIndex}
                  className="flex h-full min-h-0 w-full max-h-full flex-1 justify-center"
                  initial={skipMountIntro ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SeatingChartWPage tables={pageTables} />
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
          </div>

          <SeatingChartNameRoster title="N–Z" entries={rosterHalves.nz} align="right" />
        </main>
      </div>
    </div>
  )
}
