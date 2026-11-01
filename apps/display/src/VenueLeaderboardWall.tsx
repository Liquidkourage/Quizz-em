import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import { LeaderboardFrame } from './LeaderboardFrame'
import { LeaderboardHeader } from './LeaderboardHeader'
import { LeaderboardStatusRow } from './LeaderboardStatusRow'
import VenueLeaderboardPanelGrid from './VenueLeaderboardPanelGrid'
import VenueLeaderboardStatsRibbon from './VenueLeaderboardStatsRibbon'
import { resolveVenueShowdownAnswer } from './showdownDisplay'
import { useVenueLeaderboardPager } from './useVenueLeaderboardPager'
import {
  buildVenueLeaderboardPresentation,
  venueLeaderboardPageLabel,
  venueLeaderboardPageUsesFullFieldLayout,
} from './venueLeaderboardPresentation'
import {
  venueLeaderboardFooterStats,
  venueLeaderboardRowsFromTiles,
  venueTriviaLeaderboardRowsFromTiles,
  type VenueLeaderboardTrophy,
} from './venueLeaderboard'
import {
  buildVenueWallTileRows,
  venueWallBlindsHeadline,
  buildVenueCondenseProgress,
  venueWallCondenseHeadline,
  venuePublicAnswerReleased,
} from './venueWallModel'
import { useVenueHandStackBaselines } from './useVenueHandStackBaselines'

const DUAL_TROPHY_ROTATE_MS = 12_000

function buildLeaderboardMetaParts(
  playerCount: number,
  wall: DisplayVenueWallSnapshot | null,
  blindsHeadline: { amount: string; meta: string | null } | null,
  trophy: VenueLeaderboardTrophy,
): string[] {
  const parts: string[] = [
    trophy === 'trivia' ? 'Trivia brain' : 'Chip stacks',
    `${playerCount} player${playerCount === 1 ? '' : 's'}`,
  ]
  if (trophy === 'chips' && blindsHeadline?.amount) parts.push(blindsHeadline.amount)
  if (
    wall?.blindLevelNumber != null &&
    wall?.blindLevelCount != null &&
    Number.isFinite(wall.blindLevelNumber) &&
    Number.isFinite(wall.blindLevelCount)
  ) {
    parts.push(`Level ${Math.floor(wall.blindLevelNumber)} / ${Math.floor(wall.blindLevelCount)}`)
  }
  if (trophy === 'chips') {
    if (wall?.handsUntilNextBlindLevel != null && Number.isFinite(wall.handsUntilNextBlindLevel)) {
      const n = Math.floor(wall.handsUntilNextBlindLevel)
      parts.push(`${n} hand${n === 1 ? '' : 's'} to next level`)
    } else if (blindsHeadline?.meta) {
      parts.push(blindsHeadline.meta)
    }
  } else {
    parts.push('Closest guesses · all night')
  }
  return parts
}

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
  const [peakSurvivors, setPeakSurvivors] = useState(0)
  const [dualFlip, setDualFlip] = useState(0)
  const condenseHeadline = useMemo(() => venueWallCondenseHeadline(wall), [wall])
  useEffect(() => {
    if (condenseHeadline != null) {
      setPeakSurvivors((prev) => Math.max(prev, condenseHeadline.survivors))
    }
  }, [condenseHeadline])
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

  const condenseProgress = useMemo(
    () => buildVenueCondenseProgress({ wall, peakSurvivors }),
    [wall, peakSurvivors]
  )

  const tileRows = useMemo(() => buildVenueWallTileRows(wall), [wall])
  const handBaselines = useVenueHandStackBaselines(tileRows, wall?.headlinePhase ?? null)
  const chipRows = useMemo(
    () => venueLeaderboardRowsFromTiles(tileRows, handBaselines),
    [tileRows, handBaselines]
  )
  const triviaRows = useMemo(() => venueTriviaLeaderboardRowsFromTiles(tileRows), [tileRows])
  const rows = trophy === 'trivia' ? triviaRows : chipRows
  const presentation = useMemo(() => buildVenueLeaderboardPresentation(rows), [rows])
  const { currentPage, showPager, pageIndex, pageCount } = useVenueLeaderboardPager(presentation)

  const blindsHeadline = useMemo(() => venueWallBlindsHeadline(wall), [wall])
  const metaParts = useMemo(
    () => buildLeaderboardMetaParts(rows.length, wall, blindsHeadline, trophy),
    [rows.length, wall, blindsHeadline, trophy]
  )
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
  const title = trophy === 'trivia' ? 'Trivia leaders' : 'Chip leaders'

  return (
    <LeaderboardFrame fullField={fullFieldLayout}>
      <LeaderboardHeader
        title={title}
        metaParts={metaParts}
        pageText={showPager ? pageLabel.pageText : undefined}
        rankRangeText={showPager ? pageLabel.rankRangeText : undefined}
        showdownAnswer={venueShowdownAnswer}
      />

      {condenseProgress != null && trophy === 'chips' ? (
        <LeaderboardStatusRow model={condenseProgress} />
      ) : null}

      <main className="venue-lb-main flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
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

      {showPager ? (
        <div className="venue-lb-pager pointer-events-none absolute bottom-[clamp(6.5rem,12vh,8.5rem)] left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2" aria-hidden>
            {Array.from({ length: pageCount }, (_, i) => (
              <span
                key={i}
                className={`venue-lb-pager-dot ${i === pageIndex ? 'venue-lb-pager-dot--active' : ''}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </LeaderboardFrame>
  )
}
