import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import VenueCondenseProgressBar from './VenueCondenseProgressBar'
import { resolveVenueShowdownAnswer } from './showdownDisplay'
import {
  formatVenueBankroll,
  formatVenueStackDelta,
  venueLeaderboardColumnRangeLabel,
  venueLeaderboardColumns,
  venueLeaderboardFooterStats,
  venueLeaderboardRowsFromTiles,
  venueLeaderboardSplitColumns,
  type VenueLeaderboardRow,
} from './venueLeaderboard'
import {
  buildVenueWallTileRows,
  venueWallBlindsHeadline,
  buildVenueCondenseProgress,
  venueWallCondenseHeadline,
  showdownTableNums,
} from './venueWallModel'
import { venueWallUiScaleFrameStyle } from './venueWallUiScale'
import { useVenueHandStackBaselines } from './useVenueHandStackBaselines'

function splitLeaderboardName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

function leaderboardColumnStyle(rowCount: number): CSSProperties {
  return { ['--lb-rows' as string]: Math.max(1, rowCount) }
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2 17l2.5-9.5L9 11l3-8 3 8 4.5-3.5L21 17H2zm1 2h18v2H3v-2z" />
    </svg>
  )
}

function PlaceBadge({ rank, tone }: { rank: 2 | 3; tone: string }) {
  return (
    <span
      className={`inline-flex h-[0.95em] w-[0.95em] shrink-0 items-center justify-center rounded-full border font-mono text-[0.55em] font-black leading-none ${tone}`}
      aria-hidden
    >
      {rank}
    </span>
  )
}

function buildLeaderboardMetaLine(
  playerCount: number,
  wall: DisplayVenueWallSnapshot | null,
  blindsHeadline: { amount: string; meta: string | null } | null
): string {
  const parts: string[] = [`${playerCount} player${playerCount === 1 ? '' : 's'}`]
  if (blindsHeadline?.amount) parts.push(blindsHeadline.amount)
  if (
    wall?.blindLevelNumber != null &&
    wall?.blindLevelCount != null &&
    Number.isFinite(wall.blindLevelNumber) &&
    Number.isFinite(wall.blindLevelCount)
  ) {
    parts.push(`Level ${Math.floor(wall.blindLevelNumber)} / ${Math.floor(wall.blindLevelCount)}`)
  }
  if (wall?.handsUntilNextBlindLevel != null && Number.isFinite(wall.handsUntilNextBlindLevel)) {
    const n = Math.floor(wall.handsUntilNextBlindLevel)
    parts.push(`${n} hand${n === 1 ? '' : 's'} to next level`)
  } else if (blindsHeadline?.meta) {
    parts.push(blindsHeadline.meta)
  }
  return parts.join(' · ')
}

type LeaderboardRowProps = {
  row: VenueLeaderboardRow
  rank: number
  zebra: boolean
}

function LeaderboardRow({ row, rank, zebra }: LeaderboardRowProps) {
  const { given, suffix } = splitLeaderboardName(row.name)
  const isTop = rank <= 3
  const topTier = rank === 1 ? 1 : rank === 2 ? 2 : rank === 3 ? 3 : 0

  const rowShell =
    topTier === 1
      ? 'border border-amber-400/45 bg-gradient-to-r from-amber-950/55 via-yellow-950/35 to-amber-950/25 shadow-[inset_0_0_24px_rgba(251,191,36,0.08)]'
      : topTier === 2
        ? 'border border-slate-400/35 bg-gradient-to-r from-slate-800/45 via-slate-900/35 to-slate-950/30'
        : topTier === 3
          ? 'border border-orange-700/40 bg-gradient-to-r from-orange-950/45 via-amber-950/30 to-slate-950/25'
          : zebra
            ? 'bg-white/[0.05]'
            : 'bg-black/10'

  const rankClass = isTop ? 'venue-lb-row-rank-top' : 'venue-lb-row-rank'
  const nameClass = isTop ? 'venue-lb-row-name-top' : 'venue-lb-row-name'
  const stackClass = isTop ? 'venue-lb-row-stack-top' : 'venue-lb-row-stack'

  const rankTone =
    topTier === 1
      ? 'text-amber-200'
      : topTier === 2
        ? 'text-slate-200'
        : topTier === 3
          ? 'text-orange-200/95'
          : 'text-amber-300/90'

  return (
    <div
      className={`flex h-full min-h-0 min-w-0 items-center gap-2 px-2 leading-none ${isTop ? 'py-[0.18em]' : 'py-[0.1em]'} ${rowShell} ${
        !isTop ? 'border-b border-white/[0.06]' : 'my-[1px]'
      }`}
    >
      <span className={`flex w-[1.65em] shrink-0 items-center justify-end gap-0.5 ${rankClass}`}>
        {topTier === 1 ? (
          <CrownIcon className="h-[0.95em] w-[0.95em] shrink-0 text-amber-300" />
        ) : topTier === 2 ? (
          <PlaceBadge rank={2} tone="border-slate-300/70 bg-slate-400/25 text-slate-100" />
        ) : topTier === 3 ? (
          <PlaceBadge rank={3} tone="border-orange-400/60 bg-orange-700/30 text-orange-100" />
        ) : null}
        <span className={`font-mono font-black tabular-nums ${rankTone}`}>{rank}</span>
      </span>
      <span className={`min-w-0 flex-1 truncate font-semibold text-white/95 ${nameClass}`}>
        {given}
        {suffix ? <span className="font-medium text-amber-100/45"> {suffix}</span> : null}
      </span>
      {row.stackDelta != null && row.stackDelta !== 0 ? (
        <span
          className={`${rankClass} shrink-0 font-black leading-none ${
            row.stackDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
          title={formatVenueStackDelta(row.stackDelta)}
          aria-hidden
        >
          {row.stackDelta > 0 ? '▲' : '▼'}
        </span>
      ) : (
        <span className={`${rankClass} w-[0.85em] shrink-0`} aria-hidden />
      )}
      <span className={`shrink-0 font-mono font-bold tabular-nums text-emerald-400 ${stackClass}`}>
        {formatVenueBankroll(row.bankroll)}
      </span>
    </div>
  )
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
    [tileRows, handBaselines],
  )
  const columnCount = useMemo(() => venueLeaderboardColumns(rows.length), [rows.length])
  const { columns, rowCount } = useMemo(
    () => venueLeaderboardSplitColumns(rows, columnCount),
    [rows, columnCount],
  )
  const blindsHeadline = useMemo(() => venueWallBlindsHeadline(wall), [wall])
  const metaLine = useMemo(
    () => buildLeaderboardMetaLine(rows.length, wall, blindsHeadline),
    [rows.length, wall, blindsHeadline],
  )
  const inVenueShowdown = useMemo(() => showdownTableNums(tileRows).length > 0, [tileRows])
  const venueShowdownAnswer = useMemo(
    () => (inVenueShowdown ? resolveVenueShowdownAnswer(wall, tileRows) : undefined),
    [inVenueShowdown, wall, tileRows],
  )
  const footerStats = useMemo(
    () => venueLeaderboardFooterStats(rows, condenseHeadline?.liveTables ?? tileRows.length),
    [rows, condenseHeadline?.liveTables, tileRows.length],
  )
  const showFooter = rows.length > 0 && rowCount <= 18

  if (rows.length === 0) return null

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#050a18] via-slate-950 to-[#050a18]">
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden text-white"
        style={venueWallUiScaleFrameStyle()}
      >
        <header className="shrink-0 border-b border-amber-700/30 bg-black/50 px-4 py-2 backdrop-blur-md sm:px-5 sm:py-2.5">
          <div className="flex w-full items-start gap-x-4 gap-y-2">
            <div className="w-[clamp(4.5rem,min(14vw,7.5rem),9rem)] shrink-0 pt-0.5">
              <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
                <QuizzEmWordmark layout="fill" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <h1 className="venue-lb-title text-amber-300">Leaderboard</h1>
                <CrownIcon className="hidden h-[0.85em] w-[0.85em] shrink-0 text-amber-400/80 sm:block" />
              </div>
              <p className="venue-lb-meta mt-1 truncate font-semibold uppercase tracking-wide text-white/75">
                {metaLine}
              </p>
            </div>
            {inVenueShowdown && venueShowdownAnswer != null ? (
              <div
                className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-amber-400/55 bg-amber-950/45 px-3 py-1.5 shadow-[0_0_20px_rgba(251,191,36,0.12)] sm:min-w-[6.5rem]"
                aria-label={`Correct answer ${formatTriviaNumber(venueShowdownAnswer)}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/75 sm:text-xs">
                  Correct answer
                </span>
                <div className="font-mono text-2xl font-black tabular-nums tracking-tight text-amber-100 sm:text-3xl">
                  {formatTriviaNumber(venueShowdownAnswer)}
                </div>
              </div>
            ) : null}
          </div>
          {condenseProgress != null ? (
            <div className="mt-2">
              <VenueCondenseProgressBar
                model={condenseProgress}
                variant="headline"
                showCombineCallout
              />
            </div>
          ) : null}
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-1.5 pt-1.5 sm:px-3">
          <motion.div
            className="@container/size grid min-h-0 flex-1 gap-x-2 sm:gap-x-2.5"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {columns.map((colRows, colIndex) => (
              <div
                key={`lb-col-${colIndex}`}
                className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-amber-700/25 bg-slate-950/35 shadow-[inset_0_1px_0_rgba(251,191,36,0.06)]"
              >
                <div className="venue-lb-column-header shrink-0 border-b border-amber-700/20 bg-black/25 py-1 text-center text-amber-200/75">
                  {venueLeaderboardColumnRangeLabel(colIndex, rowCount, rows.length)}
                </div>
                <div
                  className="@container/size grid min-h-0 flex-1 overflow-hidden"
                  style={{
                    ...leaderboardColumnStyle(rowCount),
                    gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
                  }}
                >
                  {colRows.map((row, rowIndex) => {
                    const rank = colIndex * rowCount + rowIndex + 1
                    const zebra = rowIndex % 2 === 0
                    return (
                      <LeaderboardRow
                        key={`${row.tableNum}-${row.seatNum}-${row.name}`}
                        row={row}
                        rank={rank}
                        zebra={zebra}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </motion.div>

          {showFooter && footerStats != null ? (
            <footer className="venue-lb-footer mt-1.5 shrink-0 truncate border-t border-amber-800/25 bg-black/30 px-2 py-1.5 text-white/65 sm:px-3">
              <span className="text-amber-200/80">Top stack:</span>{' '}
              <span className="font-semibold text-white/90">
                {footerStats.topName} {formatVenueBankroll(footerStats.topStack)}
              </span>
              <span className="px-2 text-white/30" aria-hidden>
                ·
              </span>
              <span className="text-amber-200/80">Average stack:</span>{' '}
              <span className="font-mono font-semibold tabular-nums text-emerald-400/90">
                {formatVenueBankroll(footerStats.averageStack)}
              </span>
              <span className="px-2 text-white/30" aria-hidden>
                ·
              </span>
              <span className="text-amber-200/80">Median stack:</span>{' '}
              <span className="font-mono font-semibold tabular-nums text-emerald-400/90">
                {formatVenueBankroll(footerStats.medianStack)}
              </span>
              <span className="px-2 text-white/30" aria-hidden>
                ·
              </span>
              <span className="text-amber-200/80">Active tables:</span>{' '}
              <span className="font-mono font-semibold tabular-nums text-white/85">
                {footerStats.liveTables}
              </span>
            </footer>
          ) : null}
        </main>
      </div>
    </div>
  )
}
