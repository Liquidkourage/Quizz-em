import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { PokerChip, StadiumTableSeats, type StadiumTableSeat } from '@qhe/ui'
import {
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import type { ShowdownWallDensity } from './showdownWallLayout'
import { SHOWDOWN_FELT_STYLE } from './showdownTheme'

const VENUE_SEAT_SLOTS = 8

type ShowdownTableCardProps = {
  tableNum: number
  correctAnswer: number | undefined
  pot: number
  rows: ShowdownResultRow[]
  density?: ShowdownWallDensity
  className?: string
}

function formatChipPayout(amount: number): string {
  return `+$${amount.toLocaleString()}`
}

function seatInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function rowsToStadiumSeats(
  rows: ShowdownResultRow[],
  winnerKeys: ReadonlySet<string>,
  correctAnswer: number | undefined,
  compact: boolean
): StadiumTableSeat[] {
  return rows.map((row) => {
    const key = `${row.seat}:${row.name}`
    const isWinner = winnerKeys.has(key)
    const hasGuess =
      !row.hasFolded && row.submitted != null && typeof correctAnswer === 'number'
    const distance =
      hasGuess && typeof correctAnswer === 'number'
        ? Math.abs(row.submitted! - correctAnswer)
        : null

    const tagText = compact ? 'text-[0.55rem] leading-none' : 'text-[0.62rem] sm:text-xs leading-tight'
    const guessText = compact ? 'text-[0.65rem]' : 'text-sm sm:text-base'

    return {
      index: row.seat - 1,
      label: seatInitials(row.name),
      labelClassName: compact
        ? 'text-[7px] font-black'
        : 'text-[8px] font-black sm:text-[9px]',
      state: row.hasFolded ? 'folded' : isWinner ? 'winner' : 'default',
      holeDigits: row.holes,
      faceDown: false,
      holeVariant: isWinner ? 'gold' : 'cyan',
      'aria-label': `${row.name}, seat ${row.seat}${isWinner ? ', winner' : ''}`,
      nameTag: (
        <>
          <span className={`max-w-full truncate font-bold text-white ${tagText}`}>{row.name}</span>
          <span className={`font-mono font-black tabular-nums text-amber-100 ${guessText}`}>
            {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
          </span>
          {distance != null ? (
            <span
              className={`font-mono font-bold tabular-nums ${tagText} ${
                isWinner ? 'text-emerald-300' : 'text-white/45'
              }`}
            >
              ±{formatTriviaNumber(distance)}
            </span>
          ) : null}
          {row.chipPayout != null && row.chipPayout > 0 ? (
            <span className={`font-mono font-black tabular-nums text-emerald-300 ${tagText}`}>
              {formatChipPayout(row.chipPayout)}
            </span>
          ) : null}
        </>
      ),
      nameTagClassName: isWinner ? 'drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]' : undefined,
    }
  })
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
  const winnerRows = activeRows.filter((r) => winnerKeys.has(`${r.seat}:${r.name}`))
  const compact = density === 'compact'
  const potShown = typeof pot === 'number' && Number.isFinite(pot) && pot > 0 ? Math.round(pot) : 0

  const communityBoard = activeRows[0]?.communityBoard ?? null

  const stadiumSeats = useMemo(
    () => rowsToStadiumSeats(sorted.filter((r) => r.name.trim() !== ''), winnerKeys, correctAnswer, compact),
    [sorted, winnerKeys, correctAnswer, compact]
  )

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
        className={`min-h-0 flex-1 p-1.5 sm:p-2 ${compact ? '' : 'sm:p-2.5'}`}
        role="group"
        aria-label={`Table ${tableNum} showdown results`}
      >
        <StadiumTableSeats
          seatCount={VENUE_SEAT_SLOTS}
          seats={stadiumSeats}
          hideEmptySeats
          communityDigits={communityBoard ?? undefined}
          aspectClassName={compact ? 'aspect-[8/5] h-full min-h-0' : 'aspect-[8/5] h-full min-h-0'}
          centerContent={
            potShown > 0 ? (
              <span
                className={`rounded border border-yellow-500/40 bg-black/55 px-1.5 py-0.5 font-mono font-black tabular-nums text-yellow-200 ${
                  compact ? 'text-[0.55rem]' : 'text-xs'
                }`}
              >
                ${potShown.toLocaleString()}
              </span>
            ) : null
          }
        />
      </div>
    </motion.article>
  )
}
