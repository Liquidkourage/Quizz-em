import { useMemo, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { venueBanquetLayout } from './venueFloorGridLayout'
import { buildVenueWallTileRows, seatingChartTablesFromTiles } from './venueWallModel'
import { venueWallUiScaleFrameStyle } from './venueWallUiScale'

/** Scale type from card height ÷ name rows (two columns → half the vertical rows). */
function seatingTableCardStyle(seatCount: number): CSSProperties {
  const seatRows = Math.ceil(Math.max(1, seatCount) / 2)
  return { ['--seat-rows' as string]: seatRows }
}

const SEAT_NAME_FONT: CSSProperties = {
  fontSize:
    'min(2.75rem, max(0.9rem, calc((100cqh - 2.55rem) / var(--seat-rows) * 0.88)))',
}

const SEAT_NUM_FONT: CSSProperties = {
  fontSize:
    'min(1.85rem, max(0.72rem, calc((100cqh - 2.55rem) / var(--seat-rows) * 0.58)))',
}

const TABLE_TITLE_FONT: CSSProperties = {
  fontSize:
    'min(2.35rem, max(1.1rem, calc((100cqh - 2.55rem) / var(--seat-rows) * 0.58)))',
}

/** "Alice C." → given name + surname initial for two-tone rendering. */
function splitSeatingDisplayName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

function SeatingPlayerName({ name, style }: { name: string; style: CSSProperties }) {
  const { given, suffix } = splitSeatingDisplayName(name)
  return (
    <span style={style} className="min-w-0 flex-1 truncate leading-none">
      <span className="font-semibold text-white">{given}</span>
      {suffix ? <span className="font-medium text-amber-100/45"> {suffix}</span> : null}
    </span>
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
            compactHeader ? 'px-3 py-1.5' : 'px-4 py-3 sm:px-5 sm:py-4'
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
                <span className="font-semibold tabular-nums text-amber-200/90">{totalSeated}</span> players
                across{' '}
                <span className="font-semibold tabular-nums text-amber-200/90">{tables.length}</span> tables
                {' — '}
                waiting for the host to start the round
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden px-1.5 pb-1.5 pt-1 sm:px-2 sm:pb-2">
          <motion.div
            className="grid h-full min-h-0 w-full gap-1 sm:gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${grid.rowCount}, minmax(0, 1fr))`,
            }}
            initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {tables.map((table, tableIndex) => {
              const seatRows = Math.ceil(table.seats.length / 2)
              const gridCol = tableIndex % grid.columns
              const gridRow = Math.floor(tableIndex / grid.columns)
              const checker = (gridRow + gridCol) % 2 === 0
              return (
                <article
                  key={table.tableNum}
                  style={seatingTableCardStyle(table.seats.length)}
                  className={`@container/size flex h-full min-h-0 flex-col overflow-hidden rounded-lg border shadow-[0_2px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(251,191,36,0.1)] backdrop-blur-md sm:rounded-xl ${
                    checker
                      ? 'border-amber-600/40 bg-slate-950/92'
                      : 'border-amber-700/25 bg-slate-900/88'
                  }`}
                  aria-label={`Table ${table.tableNum}, ${table.seats.length} players`}
                >
                  <div
                    style={TABLE_TITLE_FONT}
                    className="flex shrink-0 items-baseline justify-center gap-[0.35em] border-b border-amber-500/45 bg-gradient-to-b from-amber-500/25 to-amber-600/10 px-2 py-1 leading-none"
                  >
                    <span className="text-[0.42em] font-bold uppercase tracking-[0.22em] text-amber-300/75">
                      Table
                    </span>
                    <span className="font-black tabular-nums text-amber-50 [text-shadow:0_1px_8px_rgba(251,191,36,0.35)]">
                      {table.tableNum}
                    </span>
                  </div>
                  <ul
                    className="grid min-h-0 flex-1 gap-x-0 px-0.5 py-0.5"
                    style={{
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                      gridTemplateRows: `repeat(${seatRows}, minmax(0, 1fr))`,
                      gridAutoFlow: 'column',
                    }}
                  >
                    {table.seats.map((seat, seatIndex) => {
                      const rowIndex = seatIndex % seatRows
                      const colIndex = Math.floor(seatIndex / seatRows)
                      const zebra = rowIndex % 2 === 0
                      const isLastInColumn =
                        colIndex === 0
                          ? seatIndex === Math.min(seatRows, table.seats.length) - 1
                          : seatIndex === table.seats.length - 1
                      return (
                        <li
                          key={seat.seatNum}
                          className={`flex min-h-0 min-w-0 items-center gap-1.5 px-1.5 leading-none ${
                            zebra ? 'bg-white/[0.06]' : 'bg-black/10'
                          } ${colIndex === 1 ? 'border-l border-amber-600/25' : ''} ${
                            !isLastInColumn ? 'border-b border-white/[0.07]' : ''
                          }`}
                        >
                          <span
                            style={SEAT_NUM_FONT}
                            className="flex aspect-square h-[1.45em] w-[1.45em] shrink-0 items-center justify-center rounded-md bg-amber-950/80 font-mono font-black tabular-nums text-amber-200 ring-1 ring-amber-500/30"
                          >
                            {seat.seatNum}
                          </span>
                          <SeatingPlayerName name={seat.name} style={SEAT_NAME_FONT} />
                        </li>
                      )
                    })}
                  </ul>
                </article>
              )
            })}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
