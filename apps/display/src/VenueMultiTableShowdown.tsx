import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import ShowdownTableCard from './ShowdownTableCard'
import {
  showdownCorrectAnswerFromTile,
  showdownRowsFromTile,
} from './showdownDisplay'
import { showdownWallLayout } from './showdownWallLayout'
import { SHOWDOWN_FELT_STYLE } from './showdownTheme'

type VenueMultiTableShowdownProps = {
  tiles: DisplayVenueTileSnapshot[]
  /** Shared trivia headline when every table uses the same question answer. */
  headlineQuestionText?: string | null
  className?: string
}

/**
 * Full-screen takeover: every table in showdown at once, scaled for 1–20 felts
 * with no page scroll — density steps down as table count grows.
 */
export default function VenueMultiTableShowdown({
  tiles,
  headlineQuestionText = null,
  className = '',
}: VenueMultiTableShowdownProps) {
  const showdownTiles = useMemo(
    () =>
      tiles
        .filter((t) => t.phase === 'showdown')
        .filter((t) => showdownRowsFromTile(t).length > 0)
        .sort((a, b) => a.tableNum - b.tableNum),
    [tiles]
  )

  const firstAnswer = showdownTiles[0]
    ? showdownCorrectAnswerFromTile(showdownTiles[0])
    : undefined
  const sharedAnswer = showdownTiles.every(
    (t) => showdownCorrectAnswerFromTile(t) === firstAnswer
  )
    ? firstAnswer
    : undefined

  const { columns, rows, density, gapClass } = showdownWallLayout(showdownTiles.length)

  if (showdownTiles.length === 0) return null

  const overlay = (
    <motion.div
      className={`fixed inset-0 z-[85] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Venue showdown — ${showdownTiles.length} table${showdownTiles.length === 1 ? '' : 's'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header
        className="flex shrink-0 items-center gap-3 border-b border-yellow-600/50 px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5"
        style={{
          ...SHOWDOWN_FELT_STYLE,
          paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="hidden w-[clamp(5rem,12vw,7.5rem)] shrink-0 sm:block">
          <div className="w-full shadow-black/60 drop-shadow-lg" style={{ aspectRatio: '958 / 592' }}>
            <QuizzEmWordmark layout="fill" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-amber-200/75 sm:text-xs">
            Venue showdown
          </p>
          <h2 className="truncate text-lg font-black uppercase tracking-wide text-white sm:text-xl md:text-2xl">
            {showdownTiles.length === 1
              ? `Table ${showdownTiles[0]!.tableNum}`
              : `${showdownTiles.length} tables`}
          </h2>
          {headlineQuestionText ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/65 sm:text-sm">
              {headlineQuestionText}
            </p>
          ) : null}
        </div>
        {sharedAnswer != null ? (
          <div className="shrink-0 text-right">
            <p className="text-[0.55rem] font-bold uppercase tracking-wider text-white/45 sm:text-xs">
              Correct
            </p>
            <p className="font-mono text-2xl font-black tabular-nums text-amber-100 sm:text-3xl md:text-4xl">
              {formatTriviaNumber(sharedAnswer)}
            </p>
          </div>
        ) : (
          <p className="shrink-0 text-xs text-white/50 sm:text-sm">Per-table answers</p>
        )}
      </header>

      <div
        className={`grid min-h-0 flex-1 p-2 sm:p-3 ${gapClass}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {showdownTiles.map((tile) => (
          <ShowdownTableCard
            key={tile.tableNum}
            tableNum={tile.tableNum}
            correctAnswer={showdownCorrectAnswerFromTile(tile)}
            pot={tile.pot}
            rows={showdownRowsFromTile(tile)}
            density={density}
            className="h-full min-h-0"
          />
        ))}
      </div>
    </motion.div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(overlay, document.body)
  }
  return overlay
}
