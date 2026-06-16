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
import { DISPLAY_TEXT_PRIMARY, DISPLAY_TEXT_SECONDARY } from './displayTypography'

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
  const allSameAnswer = showdownTiles.every(
    (t) => showdownCorrectAnswerFromTile(t) === firstAnswer
  )
  const headerAnswer =
    typeof firstAnswer === 'number' && Number.isFinite(firstAnswer) && allSameAnswer
      ? firstAnswer
      : showdownTiles.length === 1
        ? firstAnswer
        : showdownTiles
            .map((t) => showdownCorrectAnswerFromTile(t))
            .find((a) => typeof a === 'number' && Number.isFinite(a))

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
          <p className={`font-bold uppercase tracking-[0.22em] text-amber-200/75 ${DISPLAY_TEXT_SECONDARY}`}>
            Venue showdown
          </p>
          <h2 className={`truncate font-black uppercase tracking-wide text-white ${DISPLAY_TEXT_PRIMARY}`}>
            {showdownTiles.length === 1
              ? `Table ${showdownTiles[0]!.tableNum}`
              : `${showdownTiles.length} tables`}
          </h2>
          {headlineQuestionText ? (
            <p className={`mt-0.5 line-clamp-2 text-white/65 ${DISPLAY_TEXT_SECONDARY}`}>
              {headlineQuestionText}
            </p>
          ) : null}
        </div>
        {typeof headerAnswer === 'number' && Number.isFinite(headerAnswer) ? (
          <div className="shrink-0 rounded-xl border border-amber-400/45 bg-black/35 px-3 py-2 text-right sm:px-4 sm:py-2.5">
            <p className={`font-bold uppercase tracking-[0.18em] text-amber-200/80 ${DISPLAY_TEXT_SECONDARY}`}>
              Correct answer
            </p>
            <p className={`font-mono font-black tabular-nums leading-none text-amber-100 ${DISPLAY_TEXT_PRIMARY}`}>
              {formatTriviaNumber(headerAnswer)}
            </p>
          </div>
        ) : (
          <p className={`shrink-0 text-white/50 ${DISPLAY_TEXT_SECONDARY}`}>Answer on each table</p>
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
