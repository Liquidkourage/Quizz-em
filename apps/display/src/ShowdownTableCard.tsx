import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { PokerChip } from '@qhe/ui'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import {
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import type { ShowdownWallDensity } from './showdownWallLayout'
import { SHOWDOWN_FELT_STYLE } from './showdownTheme'

type ShowdownTableCardProps = {
  tableNum: number
  correctAnswer: number | undefined
  pot: number
  rows: ShowdownResultRow[]
  /** Scales typography and player layout for the full-screen venue wall grid. */
  density?: ShowdownWallDensity
  className?: string
}

function formatChipPayout(amount: number): string {
  return `+$${amount.toLocaleString()}`
}

/** One player cell in the per-table results grid — readable at venue-wall scale. */
function PlayerResultTile({
  row,
  correctAnswer,
  isWinner,
  density,
}: {
  row: ShowdownResultRow
  correctAnswer: number | undefined
  isWinner: boolean
  density: ShowdownWallDensity
}) {
  const compact = density === 'compact'
  const hasGuess =
    !row.hasFolded && row.submitted != null && typeof correctAnswer === 'number'
  const distance =
    hasGuess && typeof correctAnswer === 'number'
      ? Math.abs(row.submitted! - correctAnswer)
      : null

  return (
    <div
      className={`grid min-w-0 grid-rows-[auto_auto_auto] gap-1 rounded-lg border ${
        compact ? 'p-1.5' : 'gap-1.5 p-2'
      } ${
        isWinner
          ? 'border-amber-400/60 bg-gradient-to-b from-amber-950/55 to-amber-950/25 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.2)]'
          : 'border-white/12 bg-black/35'
      }`}
      aria-label={`${row.name}, seat ${row.seat}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full font-mono font-black tabular-nums ${
            compact ? 'h-6 w-6 text-[0.65rem]' : 'h-8 w-8 text-xs sm:text-sm'
          } ${isWinner ? 'bg-amber-500/30 text-amber-50' : 'bg-black/45 text-white/75'}`}
        >
          {row.seat}
        </span>
        <p
          className={`min-w-0 flex-1 truncate font-bold leading-tight text-white ${
            compact ? 'text-xs' : 'text-sm sm:text-base'
          }`}
        >
          {row.name}
        </p>
        {isWinner && !compact ? <PokerChip size="sm" className="shrink-0 opacity-90" /> : null}
      </div>

      {!compact ? (
        <ShowdownFiveCardsUsed row={row} size="md" />
      ) : null}

      <div
        className={`grid items-end gap-x-2 ${
          row.chipPayout != null && row.chipPayout > 0 ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'
        }`}
      >
        <div className="min-w-0 leading-none">
          <p
            className={`font-mono font-black tabular-nums text-amber-50 ${
              compact ? 'text-base' : 'text-xl sm:text-2xl'
            }`}
          >
            {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
          </p>
          {distance != null ? (
            <p
              className={`mt-0.5 font-mono font-bold tabular-nums ${
                compact ? 'text-[0.65rem]' : 'text-xs'
              } ${isWinner ? 'text-emerald-300' : 'text-white/45'}`}
            >
              ±{formatTriviaNumber(distance)}
            </p>
          ) : null}
        </div>
        {row.chipPayout != null && row.chipPayout > 0 ? (
          <p
            className={`shrink-0 font-mono font-black tabular-nums text-emerald-300 ${
              compact ? 'text-xs' : 'text-sm sm:text-base'
            }`}
          >
            {formatChipPayout(row.chipPayout)}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function playerGridColumns(playerCount: number, density: ShowdownWallDensity): number {
  if (density === 'full') {
    if (playerCount <= 2) return playerCount
    if (playerCount <= 4) return 2
    if (playerCount <= 6) return 3
    return 2
  }
  /** Venue wall with many tables: always 2-wide player grid inside each felt. */
  return 2
}

export default function ShowdownTableCard({
  tableNum,
  correctAnswer,
  pot,
  rows,
  density = 'full',
  className = '',
}: ShowdownTableCardProps) {
  const { rows: sorted, winnerKeys } = sortShowdownRowsByDistance(rows, correctAnswer)
  const activeRows = sorted.filter((r) => r.name.trim() !== '' && !r.hasFolded)
  const displayRows = activeRows
  const winnerRows = activeRows.filter((r) => winnerKeys.has(`${r.seat}:${r.name}`))
  const compact = density === 'compact'
  const playerCols = playerGridColumns(displayRows.length, density)
  const potShown = typeof pot === 'number' && Number.isFinite(pot) && pot > 0 ? Math.round(pot) : 0

  return (
    <motion.article
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-yellow-600/45 bg-black/55 shadow-lg ${className}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-2 border-b border-white/10 ${
          compact ? 'px-2 py-1' : 'px-3 py-2 sm:px-3.5 sm:py-2.5'
        }`}
        style={SHOWDOWN_FELT_STYLE}
      >
        <p
          className={`font-mono font-black tabular-nums leading-none text-yellow-400 ${
            compact ? 'text-lg' : 'text-2xl sm:text-3xl'
          }`}
        >
          {tableNum}
        </p>
        <div className="min-w-0 text-right leading-tight">
          <p className="text-[0.5rem] font-bold uppercase tracking-wider text-amber-200/70 sm:text-[0.55rem]">
            Answer
          </p>
          <p
            className={`font-mono font-black tabular-nums text-amber-100 ${
              compact ? 'text-sm' : 'text-lg sm:text-xl'
            }`}
          >
            {formatTriviaNumber(correctAnswer)}
          </p>
          {potShown > 0 ? (
            <p
              className={`font-mono font-bold tabular-nums text-yellow-300 ${
                compact ? 'text-[0.6rem]' : 'text-xs sm:text-sm'
              }`}
            >
              ${potShown.toLocaleString()}
            </p>
          ) : null}
        </div>
      </header>

      {winnerRows.length > 0 ? (
        <div
          className={`flex shrink-0 items-center justify-center gap-1 border-b border-amber-500/30 bg-amber-950/35 ${
            compact ? 'px-1.5 py-0.5' : 'gap-1.5 px-2 py-1.5'
          }`}
        >
          {!compact ? <PokerChip size="sm" /> : null}
          <p
            className={`min-w-0 truncate text-center font-black uppercase tracking-wide text-amber-50 ${
              compact ? 'text-[0.6rem]' : 'text-sm sm:text-base'
            }`}
          >
            {winnerRows.length === 1
              ? winnerRows[0]!.name
              : `Split · ${winnerRows.map((w) => w.name).join(' · ')}`}
          </p>
        </div>
      ) : null}

      <div
        className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain ${compact ? 'p-1.5' : 'p-2 sm:p-2.5'}`}
        role="group"
        aria-label={`Table ${tableNum} showdown results`}
      >
        <div
          className={`grid ${compact ? 'gap-1.5' : 'gap-2 sm:gap-2.5'}`}
          style={{
            gridTemplateColumns: `repeat(${playerCols}, minmax(0, 1fr))`,
          }}
        >
          {displayRows.map((row) => (
            <PlayerResultTile
              key={`${row.seat}:${row.name}`}
              row={row}
              correctAnswer={correctAnswer}
              isWinner={winnerKeys.has(`${row.seat}:${row.name}`)}
              density={density}
            />
          ))}
        </div>
      </div>
    </motion.article>
  )
}
