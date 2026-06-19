import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import VenueCondenseProgressBar from './VenueCondenseProgressBar'
import {
  formatVenueBankroll,
  formatVenueStackDelta,
  venueLeaderboardColumns,
  venueLeaderboardRowsFromTiles,
} from './venueLeaderboard'
import { buildVenueWallTileRows, venueWallBlindsHeadline, buildVenueCondenseProgress, venueWallCondenseHeadline } from './venueWallModel'
import { venueWallUiScaleFrameStyle } from './venueWallUiScale'
import { useVenueHandStackBaselines } from './useVenueHandStackBaselines'
import { DISPLAY_TEXT_PRIMARY, DISPLAY_TEXT_SECONDARY } from './displayTypography'

function splitLeaderboardName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

function leaderboardGridStyle(rowCount: number): CSSProperties {
  return { ['--lb-rows' as string]: Math.max(1, rowCount) }
}

const ROW_FONT: CSSProperties = {
  fontSize: 'clamp(3.5cqh, calc((100cqh - 3.5rem) / var(--lb-rows) * 0.82), 10cqh)',
}

const RANK_FONT: CSSProperties = {
  fontSize: 'clamp(3cqh, calc((100cqh - 3.5rem) / var(--lb-rows) * 0.68), 8cqh)',
}

export type VenueLeaderboardWallProps = {
  wall: DisplayVenueWallSnapshot | null
  skipMountIntro?: boolean
}

export default function VenueLeaderboardWall({
  wall,
  skipMountIntro = false,
}: VenueLeaderboardWallProps) {
  const [peakSurvivors, setPeakSurvivors] = useState(0)
  const condenseHeadline = useMemo(() => venueWallCondenseHeadline(wall), [wall])
  useEffect(() => {
    if (condenseHeadline != null) {
      setPeakSurvivors((prev) => Math.max(prev, condenseHeadline.survivors))
    }
  }, [condenseHeadline])
  const condenseProgress = useMemo(
    () => buildVenueCondenseProgress({ wall, peakSurvivors }),
    [wall, peakSurvivors],
  )

  const tileRows = useMemo(() => buildVenueWallTileRows(wall), [wall])
  const handBaselines = useVenueHandStackBaselines(tileRows, wall?.headlinePhase ?? null)
  const rows = useMemo(
    () => venueLeaderboardRowsFromTiles(tileRows, handBaselines),
    [tileRows, handBaselines]
  )
  const columns = useMemo(() => venueLeaderboardColumns(rows.length), [rows.length])
  const rowCount = useMemo(() => Math.ceil(rows.length / columns), [rows.length, columns])
  const blindsHeadline = useMemo(() => venueWallBlindsHeadline(wall), [wall])

  if (rows.length === 0) return null

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden text-white"
        style={venueWallUiScaleFrameStyle()}
      >
        <header className="shrink-0 border-b border-yellow-700/35 bg-black/45 px-4 py-2 backdrop-blur-md sm:px-5 sm:py-2.5">
          <div className="flex w-full items-center gap-x-4 gap-y-2">
            <div className="w-[clamp(5rem,min(16vw,8rem),10rem)] shrink-0">
              <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
                <QuizzEmWordmark layout="fill" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className={`font-black tracking-tight text-yellow-300 ${DISPLAY_TEXT_PRIMARY}`}>
                Leaderboard
              </h1>
              <p className={`text-white/70 ${DISPLAY_TEXT_SECONDARY}`}>
                {rows.length} player{rows.length === 1 ? '' : 's'}
                {blindsHeadline ? (
                  <>
                    {' · '}
                    <span className="font-mono tabular-nums text-amber-200/90">{blindsHeadline.amount}</span>
                    {blindsHeadline.meta ? (
                      <span className="text-white/55"> · {blindsHeadline.meta}</span>
                    ) : null}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          {condenseProgress != null ? (
            <div className="mt-2">
              <VenueCondenseProgressBar model={condenseProgress} variant="headline" />
            </div>
          ) : null}
        </header>

        <main className="min-h-0 flex-1 overflow-hidden px-2 pb-2 pt-1.5 sm:px-3">
          <motion.div
            className="@container/size grid h-full min-h-0 w-full gap-x-2 gap-y-0 sm:gap-x-3"
            style={{
              ...leaderboardGridStyle(rowCount),
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridAutoFlow: 'column',
              gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
            }}
            initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {rows.map((row, index) => {
              const { given, suffix } = splitLeaderboardName(row.name)
              const colIndex = Math.floor(index / rowCount)
              const rowIndex = index % rowCount
              const zebra = rowIndex % 2 === 0
              return (
                <div
                  key={`${row.tableNum}-${row.seatNum}-${row.name}`}
                  className={`flex min-h-0 min-w-0 items-center gap-2 px-1.5 leading-none ${
                    zebra ? 'bg-white/[0.05]' : 'bg-black/10'
                  } ${colIndex > 0 ? 'border-l border-amber-700/25' : ''} ${
                    rowIndex < rowCount - 1 ? 'border-b border-white/[0.06]' : ''
                  }`}
                >
                  <span
                    style={RANK_FONT}
                    className="w-[1.35em] shrink-0 text-right font-mono font-black tabular-nums text-amber-300/90"
                  >
                    {index + 1}
                  </span>
                  <span style={ROW_FONT} className="min-w-0 flex-1 truncate font-semibold text-white">
                    {given}
                    {suffix ? <span className="font-medium text-amber-100/45"> {suffix}</span> : null}
                  </span>
                  {row.stackDelta != null && row.stackDelta !== 0 ? (
                    <span
                      style={RANK_FONT}
                      className={`shrink-0 font-black leading-none ${
                        row.stackDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                      title={formatVenueStackDelta(row.stackDelta)}
                      aria-hidden
                    >
                      {row.stackDelta > 0 ? '▲' : '▼'}
                    </span>
                  ) : (
                    <span style={RANK_FONT} className="w-[0.85em] shrink-0" aria-hidden />
                  )}
                  <span
                    style={ROW_FONT}
                    className="shrink-0 font-mono font-bold tabular-nums text-emerald-400"
                  >
                    {formatVenueBankroll(row.bankroll)}
                  </span>
                </div>
              )
            })}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
