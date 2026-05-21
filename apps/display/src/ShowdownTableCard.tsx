import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { PokerChip } from '@qhe/ui'
import { ShowdownFiveCardsUsed, type ShowdownChipSize } from './showdownCardChips'
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

function MiniRow({
  row,
  correctAnswer,
  isWinner,
  chipSize,
  compact,
}: {
  row: ShowdownResultRow
  correctAnswer: number | undefined
  isWinner: boolean
  chipSize: ShowdownChipSize
  compact: boolean
}) {
  const hasGuess =
    !row.hasFolded && row.submitted != null && typeof correctAnswer === 'number'
  const distance =
    hasGuess && typeof correctAnswer === 'number'
      ? Math.abs(row.submitted! - correctAnswer)
      : null

  return (
    <div
      className={`flex min-w-0 flex-col items-stretch rounded-md border ${
        compact ? 'gap-1 px-1 py-1' : 'gap-1.5 px-1.5 py-2 sm:px-2'
      } ${
        isWinner
          ? 'border-amber-400/55 bg-amber-950/45'
          : 'border-white/10 bg-black/30'
      }`}
      aria-label={`${row.name}, seat ${row.seat}`}
    >
      <div className={`flex min-w-0 items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
        <span
          className={`flex shrink-0 items-center justify-center rounded-full font-mono font-black tabular-nums ${
            compact
              ? 'h-5 w-5 text-[0.6rem]'
              : 'h-7 w-7 text-xs sm:h-8 sm:w-8 sm:text-sm'
          } ${isWinner ? 'bg-amber-500/25 text-amber-100' : 'bg-black/40 text-white/70'}`}
        >
          {row.seat}
        </span>
        <p
          className={`min-w-0 flex-1 truncate font-bold leading-tight text-white ${
            compact ? 'text-[0.65rem]' : 'text-xs sm:text-sm'
          }`}
        >
          {row.name}
        </p>
        {isWinner && !compact ? <PokerChip size="sm" className="shrink-0 opacity-90" /> : null}
      </div>

      {!compact ? <ShowdownFiveCardsUsed row={row} size={chipSize} /> : null}

      <div className="text-center leading-tight">
        <p
          className={`font-mono font-black tabular-nums text-amber-100 ${
            compact ? 'text-xs' : 'text-base sm:text-lg'
          }`}
        >
          {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
        </p>
        {distance != null ? (
          <p
            className={`font-mono font-bold tabular-nums ${
              compact ? 'text-[0.55rem]' : 'text-[0.65rem] sm:text-xs'
            } ${isWinner ? 'text-emerald-300' : 'text-white/45'}`}
          >
            ±{formatTriviaNumber(distance)}
          </p>
        ) : null}
      </div>

      {row.chipPayout != null && row.chipPayout > 0 ? (
        <p
          className={`text-center font-mono font-black tabular-nums text-emerald-300 ${
            compact ? 'text-[0.65rem]' : 'text-base sm:text-lg'
          }`}
        >
          {formatChipPayout(row.chipPayout)}
        </p>
      ) : null}
    </div>
  )
}

/** One-line player row for micro density (13+ tables on the wall). */
function MicroPlayerLine({
  row,
  correctAnswer,
  isWinner,
}: {
  row: ShowdownResultRow
  correctAnswer: number | undefined
  isWinner: boolean
}) {
  const hasGuess =
    !row.hasFolded && row.submitted != null && typeof correctAnswer === 'number'
  const distance =
    hasGuess && typeof correctAnswer === 'number'
      ? Math.abs(row.submitted! - correctAnswer)
      : null

  return (
    <div
      className={`flex min-w-0 items-center gap-1 rounded border px-1 py-0.5 font-mono text-[0.6rem] leading-none tabular-nums sm:text-[0.65rem] ${
        isWinner
          ? 'border-amber-400/50 bg-amber-950/50 text-amber-50'
          : 'border-white/8 bg-black/25 text-white/75'
      }`}
    >
      <span className="w-3 shrink-0 text-center font-black text-white/50">{row.seat}</span>
      <span className="min-w-0 flex-1 truncate font-bold">{row.name}</span>
      <span className="shrink-0 text-amber-100/90">
        {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
      </span>
      {distance != null ? (
        <span className={`shrink-0 ${isWinner ? 'text-emerald-300' : 'text-white/40'}`}>
          ±{formatTriviaNumber(distance)}
        </span>
      ) : null}
      {row.chipPayout != null && row.chipPayout > 0 ? (
        <span className="shrink-0 font-black text-emerald-300">{formatChipPayout(row.chipPayout)}</span>
      ) : null}
    </div>
  )
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
  const isMicro = density === 'micro'
  const isCompact = density === 'compact' || isMicro
  const gridCols = isMicro
    ? 1
    : displayRows.length <= 4
      ? 2
      : displayRows.length <= 6
        ? 3
        : 4
  const chipSize: ShowdownChipSize = isMicro ? 'sm' : density === 'compact' ? 'sm' : gridCols >= 3 ? 'md' : 'lg'
  const potShown = typeof pot === 'number' && Number.isFinite(pot) && pot > 0 ? Math.round(pot) : 0

  return (
    <motion.article
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-yellow-600/40 bg-black/50 shadow-lg ${
        isMicro ? 'rounded-md' : 'rounded-xl'
      } ${className}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-1 border-b border-white/10 ${
          isMicro ? 'px-1.5 py-0.5' : isCompact ? 'px-2 py-1' : 'px-3 py-2 sm:px-3.5 sm:py-2.5'
        }`}
        style={SHOWDOWN_FELT_STYLE}
      >
        <p
          className={`font-mono font-black tabular-nums leading-none text-yellow-400 ${
            isMicro ? 'text-base' : isCompact ? 'text-xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {tableNum}
        </p>
        <div className="min-w-0 text-right leading-tight">
          <p
            className={`font-mono font-black tabular-nums text-amber-100 ${
              isMicro ? 'text-xs' : isCompact ? 'text-sm' : 'text-lg sm:text-xl'
            }`}
          >
            {formatTriviaNumber(correctAnswer)}
          </p>
          {potShown > 0 ? (
            <p
              className={`font-mono font-bold tabular-nums text-yellow-300 ${
                isMicro ? 'text-[0.55rem]' : 'text-xs sm:text-sm'
              }`}
            >
              ${potShown.toLocaleString()}
            </p>
          ) : null}
        </div>
      </header>

      {winnerRows.length > 0 && !isMicro ? (
        <div
          className={`flex shrink-0 items-center justify-center gap-1 border-b border-amber-500/25 bg-amber-950/30 ${
            isCompact ? 'px-1 py-0.5' : 'gap-1.5 px-2 py-1.5'
          }`}
        >
          {!isCompact ? <PokerChip size="sm" /> : null}
          <p
            className={`min-w-0 truncate font-black text-amber-50 ${
              isCompact ? 'text-[0.65rem]' : 'text-sm sm:text-base'
            }`}
          >
            {winnerRows.length === 1
              ? winnerRows[0]!.name
              : `Split · ${winnerRows.map((w) => w.name).join(' + ')}`}
          </p>
        </div>
      ) : null}

      <div
        className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain ${
          isMicro ? 'space-y-0.5 p-1' : isCompact ? 'p-1.5' : 'p-2 sm:p-2.5'
        }`}
        role="group"
        aria-label={`Table ${tableNum} showdown results`}
      >
        {isMicro ? (
          <>
            {winnerRows.length > 0 ? (
              <p className="truncate px-0.5 text-center text-[0.55rem] font-black uppercase tracking-wide text-amber-200/90">
                {winnerRows.length === 1
                  ? winnerRows[0]!.name
                  : winnerRows.map((w) => w.name).join(' · ')}
              </p>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {displayRows.map((row) => (
                <MicroPlayerLine
                  key={`${row.seat}:${row.name}`}
                  row={row}
                  correctAnswer={correctAnswer}
                  isWinner={winnerKeys.has(`${row.seat}:${row.name}`)}
                />
              ))}
            </div>
          </>
        ) : (
          <div
            className={`grid ${isCompact ? 'gap-1' : 'gap-2 sm:gap-2.5'}`}
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            }}
          >
            {displayRows.map((row) => (
              <MiniRow
                key={`${row.seat}:${row.name}`}
                row={row}
                correctAnswer={correctAnswer}
                isWinner={winnerKeys.has(`${row.seat}:${row.name}`)}
                chipSize={chipSize}
                compact={isCompact}
              />
            ))}
          </div>
        )}
      </div>
    </motion.article>
  )
}
