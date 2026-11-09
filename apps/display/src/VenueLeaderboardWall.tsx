import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { LeaderboardFrame } from './LeaderboardFrame'
import { LeaderboardHeader } from './LeaderboardHeader'
import VenueLeaderboardPanelGrid from './VenueLeaderboardPanelGrid'
import VenueLeaderboardStatsRibbon from './VenueLeaderboardStatsRibbon'
import { resolveVenueShowdownAnswer } from './showdownDisplay'
import { useVenueLeaderboardPager } from './useVenueLeaderboardPager'
import { SeatingChartPageClock } from './SeatingChartNameRoster'
import {
  buildVenueLeaderboardPresentation,
  venueLeaderboardPageDwellMs,
  venueLeaderboardPageLabel,
  venueLeaderboardPageUsesFullFieldLayout,
} from './venueLeaderboardPresentation'
import {
  venueLeaderboardFooterStats,
  triviaLeaderboardSource,
  venueLeaderboardRowsFromTiles,
  type VenueLeaderboardTrophy,
} from './venueLeaderboard'
import {
  buildVenueWallTileRows,
  venueWallCondenseHeadline,
  venuePublicAnswerReleased,
} from './venueWallModel'
import { useVenueHandStackBaselines } from './useVenueHandStackBaselines'

const DUAL_TROPHY_ROTATE_MS = 12_000

export type VenueLeaderboardWallProps = {
  wall: DisplayVenueWallSnapshot | null
  skipMountIntro?: boolean
  /** Host pin: chips, trivia, or dual rotate (default). */
  trophyMode?: 'chips' | 'trivia' | 'dual'
}

export default function VenueLeaderboardWall({
  wall,
  skipMountIntro = false,
  trophyMode = 'dual',
}: VenueLeaderboardWallProps) {
  const [dualFlip, setDualFlip] = useState(0)
  const condenseHeadline = useMemo(() => venueWallCondenseHeadline(wall), [wall])
  useEffect(() => {
    if (trophyMode !== 'dual') return
    const id = window.setInterval(() => setDualFlip((n) => n + 1), DUAL_TROPHY_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [trophyMode])

  const trophy: VenueLeaderboardTrophy =
    trophyMode === 'trivia'
      ? 'trivia'
      : trophyMode === 'chips'
        ? 'chips'
        : dualFlip % 2 === 0
          ? 'chips'
          : 'trivia'

  const tileRows = useMemo(() => buildVenueWallTileRows(wall), [wall])
  const handBaselines = useVenueHandStackBaselines(tileRows, wall?.headlinePhase ?? null)
  const chipRows = useMemo(
    () => venueLeaderboardRowsFromTiles(tileRows, handBaselines),
    [tileRows, handBaselines]
  )
  const triviaRows = useMemo(
    () => triviaLeaderboardSource(tileRows, wall?.pointsStandings ?? [], wall?.triviaField),
    [tileRows, wall?.pointsStandings, wall?.triviaField],
  )
  const rows = trophy === 'trivia' ? triviaRows : chipRows
  const presentation = useMemo(() => buildVenueLeaderboardPresentation(rows), [rows])
  const { currentPage, showPager, pageIndex, pageCount } = useVenueLeaderboardPager(presentation)

  const venueShowdownAnswer = useMemo(
    () => (venuePublicAnswerReleased(tileRows) ? resolveVenueShowdownAnswer(wall, tileRows) : undefined),
    [tileRows, wall]
  )
  const footerStats = useMemo(
    () =>
      trophy === 'chips'
        ? venueLeaderboardFooterStats(rows, condenseHeadline?.liveTables ?? tileRows.length)
        : null,
    [trophy, rows, condenseHeadline?.liveTables, tileRows.length]
  )

  if (rows.length === 0 || currentPage == null) return null

  const pageLabel = venueLeaderboardPageLabel(currentPage)
  const fullFieldLayout = venueLeaderboardPageUsesFullFieldLayout(currentPage)
  const title = trophy === 'trivia' ? 'Best of the Rest' : 'Chip leaders'
  const showClock = showPager || trophyMode === 'dual'
  const triviaClock = trophy === 'trivia' && showClock
  const chipClock = trophy === 'chips' && showClock

  return (
    <LeaderboardFrame fullField={fullFieldLayout}>
      <LeaderboardHeader
        title={title}
        pageText={showPager ? pageLabel.pageText : undefined}
        rankRangeText={showPager ? pageLabel.rankRangeText : undefined}
        showdownAnswer={venueShowdownAnswer}
      />

      <main
        className={`venue-lb-main flex min-h-0 flex-1 flex-col overflow-hidden${
          triviaClock ? ' venue-lb-main--clock' : ''
        }`}
      >
        <div className={`relative min-h-0 flex-1 overflow-hidden${chipClock ? ' venue-lb-grid-clear' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${trophy}-${pageIndex}`}
              className="absolute inset-0 flex min-h-0 flex-col"
              initial={skipMountIntro ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <VenueLeaderboardPanelGrid page={currentPage} trophy={trophy} />
            </motion.div>
          </AnimatePresence>
        </div>

        {footerStats != null ? <VenueLeaderboardStatsRibbon stats={footerStats} /> : null}
      </main>

      {showClock ? (
        <div
          className={`venue-lb-pager pointer-events-none absolute left-0 right-0 flex justify-center${
            triviaClock ? ' venue-lb-pager--trivia' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {showPager ? (
              <SeatingChartPageClock
                durationMs={venueLeaderboardPageDwellMs(pageIndex + 1)}
                cycleKey={pageIndex}
                sizeClass="seating-chart-clock--table"
              />
            ) : null}
            {trophyMode === 'dual' ? (
              <SeatingChartPageClock
                durationMs={DUAL_TROPHY_ROTATE_MS}
                cycleKey={dualFlip}
                sizeClass="seating-chart-clock--table"
              />
            ) : null}
            {showPager ? (
              <div className="flex items-center gap-2" aria-hidden>
                {Array.from({ length: pageCount }, (_, i) => (
                  <span
                    key={i}
                    className={`venue-lb-pager-dot ${i === pageIndex ? 'venue-lb-pager-dot--active' : ''}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </LeaderboardFrame>
  )
}
