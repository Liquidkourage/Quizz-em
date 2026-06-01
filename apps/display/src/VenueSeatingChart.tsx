import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { venueBanquetColumns } from './venueFloorGridLayout'
import { buildVenueWallTileRows, seatingChartTablesFromTiles } from './venueWallModel'
import { venueWallUiScaleFrameStyle } from './venueWallUiScale'

function formatStack(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
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

  const columns = useMemo(
    () => venueBanquetColumns(Math.max(tables.length, wall?.venueLiveTableCount ?? tables.length)),
    [tables.length, wall?.venueLiveTableCount],
  )

  const totalSeated =
    wall?.totalSeatedAtTables ??
    tables.reduce((sum, t) => sum + t.seats.length, 0)

  if (tables.length === 0) return null

  const dense = tables.length > 12

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden text-white"
        style={venueWallUiScaleFrameStyle()}
      >
        <header className="shrink-0 border-b border-yellow-700/35 bg-black/45 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
          <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-3">
            <div className="w-[clamp(6.5rem,min(18vw,9rem),11rem)] shrink-0">
              <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
                <QuizzEmWordmark layout="fill" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-balance text-2xl font-black tracking-tight text-yellow-300 sm:text-3xl md:text-4xl">
                Seating assignments
              </h1>
              <p className="mt-1 text-sm text-white/70 sm:text-base md:text-lg">
                {totalSeated} player{totalSeated === 1 ? '' : 's'} across {tables.length} table
                {tables.length === 1 ? '' : 's'} — waiting for the host to start the round
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-5 sm:py-4">
          <motion.div
            className="mx-auto grid w-full max-w-[100rem] gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {tables.map((table) => (
              <article
                key={table.tableNum}
                className="rounded-xl border-2 border-yellow-700/40 bg-black/55 p-2.5 backdrop-blur-md sm:p-3"
                aria-label={`Table ${table.tableNum}, ${table.seats.length} players`}
              >
                <h2
                  className={`font-black tabular-nums leading-none text-yellow-400 ${
                    dense ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                  }`}
                >
                  Table {table.tableNum}
                </h2>
                <ul className={`mt-2 space-y-1 ${dense ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
                  {table.seats.map((seat) => (
                    <li
                      key={seat.seatNum}
                      className="flex min-w-0 items-baseline justify-between gap-2 border-b border-white/[0.06] py-1 last:border-0"
                    >
                      <span className="min-w-0 truncate font-semibold text-white/92">
                        <span className="font-mono text-[0.85em] tabular-nums text-yellow-400/85">
                          {seat.seatNum}.
                        </span>{' '}
                        {seat.name}
                      </span>
                      <span className="shrink-0 font-mono text-[0.9em] font-bold tabular-nums text-emerald-400/95">
                        {formatStack(seat.bankroll)}
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
