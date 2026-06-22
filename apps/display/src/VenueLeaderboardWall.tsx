import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import VenueCondenseProgressBar from './VenueCondenseProgressBar'
import VenueLeaderboardPanelGrid from './VenueLeaderboardPanelGrid'
import VenueLeaderboardStatsRibbon from './VenueLeaderboardStatsRibbon'
import { resolveVenueShowdownAnswer } from './showdownDisplay'
import { useVenueLeaderboardPager } from './useVenueLeaderboardPager'
import {
  buildVenueLeaderboardPresentation,
  venueLeaderboardPageLabel,
} from './venueLeaderboardPresentation'
import {
  venueLeaderboardFooterStats,
  venueLeaderboardRowsFromTiles,
} from './venueLeaderboard'
import {
  buildVenueWallTileRows,
  venueWallBlindsHeadline,
  buildVenueCondenseProgress,
  venueWallCondenseHeadline,
  showdownTableNums,
} from './venueWallModel'
import { useVenueHandStackBaselines } from './useVenueHandStackBaselines'

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2 17l2.5-9.5L9 11l3-8 3 8 4.5-3.5L21 17H2zm1 2h18v2H3v-2z" />
    </svg>
  )
}

function buildLeaderboardMetaParts(
  playerCount: number,
  wall: DisplayVenueWallSnapshot | null,
  blindsHeadline: { amount: string; meta: string | null } | null
): string[] {
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
  return parts
}

function LeaderboardPageIndicator({
  pageText,
  rankRangeText,
}: {
  pageText: string
  rankRangeText: string
}) {
  return (
    <div
      className="flex shrink-0 flex-col items-end gap-0.5 text-right"
      aria-live="polite"
    >
      <span className="venue-lb-page-label font-black uppercase tracking-[0.12em] text-amber-200/90">
        {pageText}
      </span>
      <span className="venue-lb-page-range font-semibold tabular-nums text-white/70">{rankRangeText}</span>
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
  const presentation = useMemo(() => buildVenueLeaderboardPresentation(rows), [rows])
  const { currentPage, showPager, pageIndex, pageCount } = useVenueLeaderboardPager(presentation)

  const blindsHeadline = useMemo(() => venueWallBlindsHeadline(wall), [wall])
  const metaParts = useMemo(
    () => buildLeaderboardMetaParts(rows.length, wall, blindsHeadline),
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

  if (rows.length === 0 || currentPage == null) return null

  const pageLabel = venueLeaderboardPageLabel(currentPage)

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#050a18] via-[#070f1f] to-[#050a18]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(251,191,36,0.07),transparent_58%)]" />
      </div>

      <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-white">
        <header className="shrink-0 border-b border-amber-700/35 bg-black/55 px-5 py-3 backdrop-blur-md sm:px-6">
          <div className="flex w-full items-start gap-x-5 gap-y-2">
            <div className="w-[clamp(5rem,min(13vw,8rem),9.5rem)] shrink-0">
              <div className="w-full" style={{ aspectRatio: '958 / 592' }}>
                <QuizzEmWordmark layout="fill" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="venue-lb-title text-amber-300">Leaderboard</h1>
                <CrownIcon className="h-[0.75em] w-[0.75em] shrink-0 text-amber-400/85" />
              </div>
              <div className="venue-lb-meta mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold uppercase tracking-wide text-white/80">
                {metaParts.map((part, index) => (
                  <span key={`${part}-${index}`} className="inline-flex items-center gap-2">
                    {index > 0 ? (
                      <span className="text-amber-500/45" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    <span>{part}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {showPager ? (
                <LeaderboardPageIndicator
                  pageText={pageLabel.pageText}
                  rankRangeText={pageLabel.rankRangeText}
                />
              ) : null}
              {inVenueShowdown && venueShowdownAnswer != null ? (
                <div
                  className="flex flex-col items-center justify-center gap-1 rounded-lg border border-amber-400/55 bg-amber-950/50 px-4 py-2 shadow-[0_0_24px_rgba(251,191,36,0.14)]"
                  aria-label={`Correct answer ${formatTriviaNumber(venueShowdownAnswer)}`}
                >
                  <span className="venue-lb-answer-label font-bold uppercase tracking-[0.14em] text-amber-200/80">
                    Correct answer
                  </span>
                  <div className="venue-lb-answer-value font-mono font-black tabular-nums tracking-tight text-amber-100">
                    {formatTriviaNumber(venueShowdownAnswer)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {condenseProgress != null ? (
            <div className="mt-2.5">
              <VenueCondenseProgressBar
                model={condenseProgress}
                variant="headline"
                captionClass="venue-lb-condense-caption leading-tight"
              />
            </div>
          ) : null}
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-0 pt-2">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pageIndex}
                className="absolute inset-0 flex min-h-0 flex-col"
                initial={skipMountIntro ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <VenueLeaderboardPanelGrid page={currentPage} />
              </motion.div>
            </AnimatePresence>
          </div>

          {footerStats != null ? <VenueLeaderboardStatsRibbon stats={footerStats} /> : null}
        </main>

        {showPager ? (
          <div className="pointer-events-none absolute bottom-[4.75rem] left-0 right-0 flex justify-center sm:bottom-[5.25rem]">
            <div className="flex items-center gap-2" aria-hidden>
              {Array.from({ length: pageCount }, (_, i) => (
                <span
                  key={i}
                  className={`block rounded-full transition-all duration-300 ${
                    i === pageIndex
                      ? 'h-2 w-8 bg-amber-300/90 shadow-[0_0_12px_rgba(251,191,36,0.45)]'
                      : 'h-2 w-2 bg-white/25'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
