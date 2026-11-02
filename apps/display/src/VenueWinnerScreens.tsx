import { useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ANSWER_REVEAL_BEFORE_WINNERS_MS, WINNER_SCREEN_DWELL_MS } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import { SeatingChartPageClock } from './SeatingChartNameRoster'
import { usePagingCountdown } from './useSeatingChartPaging'
import { resolveVenueFloorSpec } from './venueFloorSpec'
import { VenueFloorShowdownByVariant } from './venueFloorShowdownVariants'
import { showdownCorrectAnswerFromTile, showdownRowsFromTile } from './showdownDisplay'
import { resolveShowdownDisplayPot } from './VenueFloorShowdownOverlay'

function showdownScreens(tiles: readonly DisplayVenueTileSnapshot[]): DisplayVenueTileSnapshot[] {
  return tiles
    .filter((tile) => tile.phase === 'showdown' && showdownRowsFromTile(tile).length > 0)
    .sort((a, b) => a.tableNum - b.tableNum)
}

function useHoldElapsed(holdMs: number, key: string): boolean {
  const [open, setOpen] = useState(holdMs <= 0)
  useLayoutEffect(() => {
    if (holdMs <= 0) {
      setOpen(true)
      return
    }
    setOpen(false)
    const id = window.setTimeout(() => setOpen(true), holdMs)
    return () => window.clearTimeout(id)
  }, [holdMs, key])
  return open
}

function VenueWinnerScreenPager({
  screens,
  cycleKey,
  sharedAnswer,
}: {
  screens: readonly DisplayVenueTileSnapshot[]
  cycleKey: string
  sharedAnswer?: number
}) {
  const pageIndex = usePagingCountdown(screens.length, WINNER_SCREEN_DWELL_MS, cycleKey)
  const tile = screens[pageIndex]
  if (tile == null) return null
  return (
    <VenueWinnerScreenFrame
      tile={tile}
      pageIndex={pageIndex}
      pageCount={screens.length}
      dwellMs={WINNER_SCREEN_DWELL_MS}
      correctAnswer={sharedAnswer}
    />
  )
}

/** One table, full screen, with the clock for this page. */
export function VenueWinnerScreenFrame({
  tile,
  pageIndex,
  pageCount,
  dwellMs,
  correctAnswer,
}: {
  tile: DisplayVenueTileSnapshot
  pageIndex: number
  pageCount: number
  dwellMs: number
  correctAnswer?: number
}) {
  const floorSpec = useMemo(
    () =>
      resolveVenueFloorSpec({
        populatedTableCount: 1,
        hostFocusTable: null,
        venueLiveTableCount: 1,
        withHeadline: false,
      }),
    [],
  )
  if (floorSpec == null) return null
  const rows = showdownRowsFromTile(tile)
  const answer = correctAnswer ?? showdownCorrectAnswerFromTile(tile)
  const screen = pageIndex + 1
  const overlay = (
    <div
      className="fixed inset-0 z-[180] flex flex-col bg-[#050806]"
      role="dialog"
      aria-modal="true"
      aria-label={`Winners, screen ${screen} of ${pageCount}, table ${tile.tableNum}`}
    >
      <div className="absolute right-4 top-4 z-20">
        <SeatingChartPageClock
          durationMs={dwellMs}
          cycleKey={pageIndex}
          sizeClass="seating-chart-clock--table"
        />
      </div>
      <VenueFloorShowdownByVariant
        tableNum={tile.tableNum}
        pot={resolveShowdownDisplayPot(tile, rows, answer)}
        rows={rows}
        correctAnswer={answer}
        floorSpec={floorSpec}
        stageViewport="broadcast"
      />
    </div>
  )
  if (typeof document === 'undefined') return overlay
  return createPortal(overlay, document.body)
}

/**
 * After the answer card, each showdown table gets the full winner screen once,
 * then the pass repeats until the host pays.
 */
export function VenueWinnerScreens({
  tiles,
  sharedAnswer,
}: {
  tiles: readonly DisplayVenueTileSnapshot[]
  sharedAnswer?: number
}) {
  const screens = useMemo(() => showdownScreens(tiles), [tiles])
  const key = screens.map((tile) => tile.tableNum).join(',')
  const open = useHoldElapsed(screens.length > 1 ? ANSWER_REVEAL_BEFORE_WINNERS_MS : 0, key)
  if (!open || screens.length < 2) return null
  return <VenueWinnerScreenPager screens={screens} cycleKey={key} sharedAnswer={sharedAnswer} />
}
