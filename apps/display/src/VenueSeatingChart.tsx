import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { venueBanquetLayout } from './venueFloorGridLayout'
import { buildVenueWallTileRows, seatingChartTablesFromTiles } from './venueWallModel'
import { venueWallUiScaleFrameStyle } from './venueWallUiScale'

export type VenueSeatingChartProps = {
  wall: DisplayVenueWallSnapshot | null
  skipMountIntro?: boolean
}

export default function VenueSeatingChart({ wall, skipMountIntro = false }: VenueSeatingChartProps) {
  const tables = useMemo(() => {
    const rows = buildVenueWallTileRows(wall)
    return seatingChartTablesFromTiles(rows)
  }, [wall])

  const grid = useMemo(
    () =>
      venueBanquetLayout(Math.max(tables.length, wall?.venueLiveTableCount ?? tables.length)),
    [tables.length, wall?.venueLiveTableCount],
  )

  const totalSeated =
    wall?.totalSeatedAtTables ??
    tables.reduce((sum, t) => sum + t.seats.length, 0)

  if (tables.length === 0) return null

  const compactHeader = grid.rowCount >= 3

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden text-white"
        style={venueWallUiScaleFrameStyle()}
      >
        <header
          className={`shrink-0 border-b border-yellow-700/35 bg-black/45 backdrop-blur-md ${
            compactHeader ? 'px-3 py-2' : 'px-4 py-3 sm:px-5 sm:py-4'
          }`}
        >
          <div className="flex w-full items-center gap-x-3 gap-y-2 sm:gap-x-4">
            <div
              className={`shrink-0 ${
                compactHeader
                  ? 'w-[clamp(4.5rem,min(14vw,7rem),8rem)]'
                  : 'w-[clamp(6.5rem,min(18vw,9rem),11rem)]'
              }`}
            >
              <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
                <QuizzEmWordmark layout="fill" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1
                className={`font-black tracking-tight text-yellow-300 ${
                  compactHeader
                    ? 'text-xl sm:text-2xl md:text-3xl'
                    : 'text-2xl sm:text-3xl md:text-4xl'
                }`}
              >
                Seating assignments
              </h1>
              <p
                className={`text-white/70 ${
                  compactHeader ? 'text-xs sm:text-sm md:text-base' : 'text-sm sm:text-base md:text-lg'
                }`}
              >
                {totalSeated} player{totalSeated === 1 ? '' : 's'} across {tables.length} table
                {tables.length === 1 ? '' : 's'} — waiting for the host to start the round
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden px-2 pb-2 pt-1.5 sm:px-3 sm:pb-3">
          <motion.div
            className="grid h-full min-h-0 w-full gap-1.5 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${grid.rowCount}, minmax(0, 1fr))`,
            }}
            initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {tables.map((table) => (
              <article
                key={table.tableNum}
                className="@container/size flex h-full min-h-0 flex-col overflow-hidden rounded-lg border-2 border-yellow-700/40 bg-black/55 p-1.5 backdrop-blur-md sm:rounded-xl sm:p-2"
                aria-label={`Table ${table.tableNum}, ${table.seats.length} players`}
              >
                <h2 className="shrink-0 truncate text-[clamp(0.8rem,3.8cqh,1.75rem)] font-black leading-none tabular-nums text-yellow-400">
                  Table {table.tableNum}
                </h2>
                <ul className="mt-1 flex min-h-0 flex-1 flex-col justify-evenly">
                  {table.seats.map((seat) => (
                    <li key={seat.seatNum} className="min-h-0 leading-none">
                      <span className="block min-w-0 truncate font-bold text-[clamp(0.72rem,2.65cqh,1.45rem)] text-white/95">
                        <span className="font-mono tabular-nums text-yellow-400/90">{seat.seatNum}.</span>{' '}
                        {seat.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
