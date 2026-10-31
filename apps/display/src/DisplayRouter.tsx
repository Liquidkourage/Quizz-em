import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayLayoutPayload, DisplayVenueSeatingAnnouncement, DisplayVenueWallSnapshot } from '@qhe/net'
import {
  connect,
  onDisplayLayout,
  onDisplayReleased,
  onDisplayVenueSnapshot,
  onSocketConnectionStatus,
  getSocketConnectionStatus,
  startDisplayConnectionKeepalive,
  subscribeDisplayLayoutLocal,
  type SocketConnectionStatus,
} from '@qhe/net'
import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import { displayScreenLabel, persistDisplayVenue } from './displaySession'
import { readUrlLayoutBootstrap } from './displayUrlParams'
import AudienceWelcomeWall from './AudienceWelcomeWall.tsx'
import VenueEightTablesPreview from './VenueEightTablesPreview.tsx'
import VenueSeatingChart from './VenueSeatingChart.tsx'
import VenueLeaderboardWall from './VenueLeaderboardWall.tsx'
import VenueSeatingRulesWall from './VenueSeatingRulesWall.tsx'
import { buildVenueWallTileRows, venueWallHasLiveTiles, venueWallShowSeatingChart } from './venueWallModel.ts'
import { recordServerClockSample } from './serverClock'
import { useVenueWallAutoView } from './useVenueWallAutoView'
import { hostPinnedAudienceView, resolveAudienceWallView, venueWallFloorIsLive } from './venueWallAutoView.ts'
import { useVenueBustAnnouncement } from './useVenueBustAnnouncement'
import VenueBustAnnouncement from './VenueBustAnnouncement.tsx'
import { useVenueSeatingAnnouncement, venueSeatingAnnouncementHasContent } from './useVenueSeatingAnnouncement'
import VenueSeatingAnnouncement from './VenueSeatingAnnouncement.tsx'

function normalizeVenueWallTiles(
  tiles: DisplayVenueWallSnapshot['tiles'] | undefined
): DisplayVenueWallSnapshot['tiles'] | null {
  if (tiles === undefined) return null
  if (!Array.isArray(tiles)) return null
  if (tiles.length === 0) return []
  const byNum = new Map<number, DisplayVenueWallSnapshot['tiles'][number]>()
  for (const t of tiles) {
    if (
      t != null &&
      typeof t.tableNum === 'number' &&
      Number.isInteger(t.tableNum) &&
      t.tableNum >= 1 &&
      t.tableNum <= VENUE_NUMBERED_TABLE_MAX
    ) {
      byNum.set(t.tableNum, t)
    }
  }
  return [...byNum.keys()].sort((a, b) => a - b).map((n) => byNum.get(n)!)
}

function normalizeLastHandSeating(raw: unknown): DisplayVenueSeatingAnnouncement | null {
  if (raw == null || typeof raw !== 'object') return null
  const s = raw as Partial<DisplayVenueSeatingAnnouncement>
  const moves = Array.isArray(s.moves)
    ? s.moves
        .map((m) => {
          if (m == null || typeof m !== 'object') return null
          const row = m as Partial<DisplayVenueSeatingAnnouncement['moves'][number]>
          if (typeof row.name !== 'string' || typeof row.fromTableNum !== 'number' || typeof row.toTableNum !== 'number') {
            return null
          }
          return {
            name: row.name.trim(),
            fromTableNum: Math.floor(row.fromTableNum),
            toTableNum: Math.floor(row.toTableNum),
          }
        })
        .filter((m): m is DisplayVenueSeatingAnnouncement['moves'][number] => m != null)
    : []
  const closedTableNums = Array.isArray(s.closedTableNums)
    ? s.closedTableNums
        .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
        .map((n) => Math.floor(n))
    : []
  const shuffled = s.shuffled === true
  const tablesBefore =
    typeof s.tablesBefore === 'number' && Number.isFinite(s.tablesBefore)
      ? Math.floor(s.tablesBefore)
      : 0
  const tablesAfter =
    typeof s.tablesAfter === 'number' && Number.isFinite(s.tablesAfter)
      ? Math.floor(s.tablesAfter)
      : 0
  const playerCount =
    typeof s.playerCount === 'number' && Number.isFinite(s.playerCount)
      ? Math.floor(s.playerCount)
      : 0
  const out: DisplayVenueSeatingAnnouncement = {
    moves,
    closedTableNums,
    shuffled,
    tablesBefore,
    tablesAfter,
    playerCount,
  }
  return venueSeatingAnnouncementHasContent(out) ? out : null
}

function venueOverviewFocusOff(l: DisplayLayoutPayload) {
  return l.focusTable == null
}

type DisplayRouterProps = {
  venueCode: string
  /** Pairing already joined DISPLAY:{venue} on this tab's socket — first connect skips teardown */
  pairingBootstrap?: boolean
  /** Host sent this TV back to the pairing screen. */
  onReleased?: () => void
}

/**
 * Host-driven `displayLayout` plus venue snapshot. **`VenueEightTablesPreview`** — aerial floor grid of all
 * populated tables and a stacks leaderboard strip (no single-table hero).
 */
export default function DisplayRouter({
  venueCode,
  pairingBootstrap = false,
  onReleased,
}: DisplayRouterProps) {
  const [layout, setLayout] = useState<DisplayLayoutPayload>(() => {
    if (pairingBootstrap) {
      return { layout: 'venueWall', focusTable: null, wallView: 'floor' }
    }
    return typeof window !== 'undefined'
      ? readUrlLayoutBootstrap()
      : ({ layout: 'venueWall', focusTable: null, wallView: 'floor' } satisfies DisplayLayoutPayload)
  })

  const layoutRef = useRef(layout)
  layoutRef.current = layout

  const [venueWall, setVenueWall] = useState<DisplayVenueWallSnapshot | null>(null)
  const [mosaicForcedByHost, setMosaicForcedByHost] = useState(false)
  const venueMosaicWasShownRef = useRef(false)
  const prevAudienceWelcomeRef = useRef<boolean | undefined>(undefined)

  /** All layouts are venue wall; legacy `singleTable` payloads are normalized server-side. */
  const onVenueWallLayout = true
  const tileRows = useMemo(() => buildVenueWallTileRows(venueWall), [venueWall])
  const hasFloorTables = venueWallHasLiveTiles(venueWall)
  /** Hide join hero once the floor is live (tile phase or server headline — keeps every TV in sync). */
  const venueFloorIsLive = useMemo(
    () => hasFloorTables && venueWallFloorIsLive(tileRows, venueWall?.headlinePhase ?? null),
    [hasFloorTables, tileRows, venueWall?.headlinePhase],
  )
  const hostWallView = layout.wallView ?? 'floor'
  const hostPinnedRules = onVenueWallLayout && hostWallView === 'rules'
  /**
   * Until the first venue snapshot arrives, `venueWall` is null — treat that as briefing so we never
   * flash `VenueEightTablesPreview` rehearsal tiles before `AudienceWelcomeWall` (TV pair / cold load).
   * Stay on the QR welcome screen until the server sends populated table tiles — never show an empty floor.
   */
  const audienceBriefing =
    onVenueWallLayout &&
    !hostPinnedRules &&
    (venueWall === null ||
      !hasFloorTables ||
      (venueWall.showAudienceWelcome !== false && !mosaicForcedByHost && !venueFloorIsLive))

  const autoWallView = useVenueWallAutoView(hostPinnedRules ? null : venueWall)
  const wallViewBeforeBust = resolveAudienceWallView(hostWallView, autoWallView)
  const isLeaderboardView =
    wallViewBeforeBust === 'leaderboard' || wallViewBeforeBust === 'leaderboard-trivia'
  const wouldShowSeatingChart =
    onVenueWallLayout &&
    !audienceBriefing &&
    !mosaicForcedByHost &&
    !isLeaderboardView &&
    wallViewBeforeBust !== 'rules' &&
    venueWallShowSeatingChart(venueWall, tileRows, venueWall?.serverNowMs ?? Date.now())
  const leaderboardRequested =
    onVenueWallLayout &&
    !audienceBriefing &&
    !wouldShowSeatingChart &&
    venueWall != null &&
    isLeaderboardView
  const bustAnnouncement = useVenueBustAnnouncement(venueWall, leaderboardRequested)
  const seatingAnnouncement = useVenueSeatingAnnouncement(venueWall, bustAnnouncement.visible)
  const handOverlayVisible = bustAnnouncement.visible || seatingAnnouncement.visible
  const wallView =
    handOverlayVisible && !hostPinnedAudienceView(hostWallView) ? 'floor' : wallViewBeforeBust
  const showSeatingChart = wouldShowSeatingChart && !handOverlayVisible
  const showRules =
    onVenueWallLayout && !handOverlayVisible && wallView === 'rules'
  const showLeaderboard =
    onVenueWallLayout &&
    !audienceBriefing &&
    !showSeatingChart &&
    !handOverlayVisible &&
    !showRules &&
    hasFloorTables &&
    (wallView === 'leaderboard' || wallView === 'leaderboard-trivia') &&
    venueWall != null
  const leaderboardTrophyMode =
    hostWallView === 'leaderboard-trivia'
      ? ('trivia' as const)
      : hostWallView === 'leaderboard'
        ? ('chips' as const)
        : ('dual' as const)

  /** Reconnect only when venue or host spotlight changes — not when toggling floor ↔ leaderboard. */
  const connectFingerprint = `${venueCode}:focus:${layout.focusTable ?? 'none'}`
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus>(() =>
    getSocketConnectionStatus(),
  )

  useEffect(() => onSocketConnectionStatus(setConnectionStatus), [])

  useEffect(() => {
    persistDisplayVenue(venueCode)
  }, [venueCode])

  useEffect(() => {
    if (!onReleased) return
    return onDisplayReleased(onReleased)
  }, [onReleased])

  useEffect(() => {
    const hostFocus = layout.focusTable
    /** Socket table id is legacy; venue wall mode does not pin a felt unless the host spotlighted one. */
    const tableForHello = '1'

    function handleDisplayLayout(next: DisplayLayoutPayload) {
      const merged: DisplayLayoutPayload = {
        ...next,
        wallView: next.wallView ?? layoutRef.current.wallView ?? 'floor',
      }
      layoutRef.current = merged
      setLayout(merged)
    }

    function handleLocalLayoutRelay(next: DisplayLayoutPayload) {
      handleDisplayLayout(next)
      if (venueOverviewFocusOff(next)) setMosaicForcedByHost(true)
    }

    const disconnectSock = connect('display', displayScreenLabel(), venueCode, tableForHello, {
      displayVenueWall: true,
      /** Only explicit host spotlight — never auto-derived hottest table (avoids sticky table 1). */
      displayFocusTable: hostFocus,
    })

    const offDisplay = onDisplayLayout(handleDisplayLayout)
    const offLocal = subscribeDisplayLayoutLocal(handleLocalLayoutRelay)
    const stopKeepalive = startDisplayConnectionKeepalive()

    return () => {
      stopKeepalive()
      offDisplay()
      offLocal()
      disconnectSock()
    }
  }, [connectFingerprint, venueCode])

  useEffect(() => {
    if (!venueWall) {
      prevAudienceWelcomeRef.current = undefined
      return
    }
    const show = venueWall.showAudienceWelcome !== false
    const prev = prevAudienceWelcomeRef.current
    if (prev === false && show === true) {
      setMosaicForcedByHost(false)
    }
    prevAudienceWelcomeRef.current = show
  }, [venueWall])

  useEffect(() => {
    const unsub = onDisplayVenueSnapshot((payload) => {
      const tiles = normalizeVenueWallTiles(payload?.tiles)
      if (tiles == null) return
      const p = payload as Partial<DisplayVenueWallSnapshot>
      /** Latch server-time skew first so the countdown reads the correct anchor on the very next render. */
      recordServerClockSample(p.serverNowMs ?? null)
      const next: DisplayVenueWallSnapshot = {
        tiles,
        headlineQuestionText: p.headlineQuestionText ?? null,
        answerDeadlineMs: p.answerDeadlineMs ?? null,
        answerSubmitCount:
          typeof p.answerSubmitCount === 'number' && Number.isFinite(p.answerSubmitCount)
            ? Math.max(0, Math.floor(p.answerSubmitCount))
            : null,
        answerEligibleCount:
          typeof p.answerEligibleCount === 'number' && Number.isFinite(p.answerEligibleCount)
            ? Math.max(0, Math.floor(p.answerEligibleCount))
            : null,
        headlineTableNum:
          typeof p.headlineTableNum === 'number' && Number.isFinite(p.headlineTableNum)
            ? Math.floor(p.headlineTableNum)
            : null,
        headlinePhase: typeof p.headlinePhase === 'string' ? p.headlinePhase : null,
        setlistCueNumber:
          typeof p.setlistCueNumber === 'number' && Number.isFinite(p.setlistCueNumber)
            ? Math.floor(p.setlistCueNumber)
            : null,
        setlistCueTotal:
          typeof p.setlistCueTotal === 'number' && Number.isFinite(p.setlistCueTotal)
            ? Math.floor(p.setlistCueTotal)
            : null,
        venueSmallBlind:
          typeof p.venueSmallBlind === 'number' && Number.isFinite(p.venueSmallBlind)
            ? Math.floor(p.venueSmallBlind)
            : null,
        venueBigBlind:
          typeof p.venueBigBlind === 'number' && Number.isFinite(p.venueBigBlind)
            ? Math.floor(p.venueBigBlind)
            : null,
        blindLevelNumber:
          typeof p.blindLevelNumber === 'number' && Number.isFinite(p.blindLevelNumber)
            ? Math.floor(p.blindLevelNumber)
            : null,
        blindLevelCount:
          typeof p.blindLevelCount === 'number' && Number.isFinite(p.blindLevelCount)
            ? Math.floor(p.blindLevelCount)
            : null,
        handsUntilNextBlindLevel:
          typeof p.handsUntilNextBlindLevel === 'number' && Number.isFinite(p.handsUntilNextBlindLevel)
            ? Math.floor(p.handsUntilNextBlindLevel)
            : null,
        serverNowMs: typeof p.serverNowMs === 'number' ? p.serverNowMs : undefined,
        lobbyPlayerCount:
          typeof p.lobbyPlayerCount === 'number' ? p.lobbyPlayerCount : 0,
        totalSeatedAtTables:
          typeof p.totalSeatedAtTables === 'number' ? p.totalSeatedAtTables : 0,
        venueLiveTableCount:
          typeof p.venueLiveTableCount === 'number' && Number.isFinite(p.venueLiveTableCount)
            ? Math.floor(p.venueLiveTableCount)
            : null,
        venueChipSurvivorCount:
          typeof p.venueChipSurvivorCount === 'number' && Number.isFinite(p.venueChipSurvivorCount)
            ? Math.floor(p.venueChipSurvivorCount)
            : null,
        venueHandsUntilShuffle:
          typeof p.venueHandsUntilShuffle === 'number' && Number.isFinite(p.venueHandsUntilShuffle)
            ? Math.floor(p.venueHandsUntilShuffle)
            : null,
        venueShuffleEveryHands:
          typeof p.venueShuffleEveryHands === 'number' && Number.isFinite(p.venueShuffleEveryHands)
            ? Math.floor(p.venueShuffleEveryHands)
            : null,
        venueHeld: p.venueHeld === true,
        venueShuffleHeld: p.venueShuffleHeld === true,
        /** Older servers never sent this — keep briefing until reconnect to a newer build. */
        showAudienceWelcome: p.showAudienceWelcome !== false,
        seatingChartPinnedUntilMs:
          typeof p.seatingChartPinnedUntilMs === 'number' && Number.isFinite(p.seatingChartPinnedUntilMs)
            ? Math.floor(p.seatingChartPinnedUntilMs)
            : null,
        lastHandBusts: Array.isArray(p.lastHandBusts) ? p.lastHandBusts : undefined,
        lastHandEndMs:
          typeof p.lastHandEndMs === 'number' && Number.isFinite(p.lastHandEndMs)
            ? Math.floor(p.lastHandEndMs)
            : null,
        lastHandSeating: normalizeLastHandSeating(p.lastHandSeating),
      }
      setVenueWall(next)
    })
    return () => unsub()
  }, [connectFingerprint])

  useEffect(() => {
    if (onVenueWallLayout && !audienceBriefing && !showSeatingChart && !showLeaderboard && venueWall != null) {
      venueMosaicWasShownRef.current = true
    }
  }, [onVenueWallLayout, audienceBriefing, showSeatingChart, showLeaderboard, venueWall])

  const showBriefingHero = audienceBriefing
  const showVenueMosaicShell =
    onVenueWallLayout &&
    hasFloorTables &&
    !audienceBriefing &&
    !showSeatingChart &&
    !showLeaderboard &&
    !showRules

  const showConnBadge = connectionStatus !== 'connected'

  return (
    <>
    {showConnBadge ? (
      <div
        className="pointer-events-none fixed left-1/2 top-3 z-[100] -translate-x-1/2 rounded-md border border-amber-400/40 bg-black/80 px-4 py-2 text-sm font-semibold tracking-wide text-amber-100 shadow-lg"
        role="status"
        aria-live="polite"
      >
        {connectionStatus === 'reconnecting' ? 'Reconnecting display…' : 'Display disconnected — retrying…'}
      </div>
    ) : null}
    {venueWall?.venueHeld === true && !showBriefingHero && !showSeatingChart ? (
      <div
        className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-black/55"
        role="status"
        aria-live="polite"
      >
        <div className="rounded-2xl border border-amber-300/50 bg-black/80 px-10 py-8 text-center shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-200/80">Hold</p>
          <p className="mt-2 text-5xl font-black text-white">We'll resume</p>
        </div>
      </div>
    ) : null}
    <AnimatePresence mode="sync">
      {showBriefingHero && (
        <motion.div
          key="venue-join-hero"
          className="relative z-10 min-h-screen w-full"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <AudienceWelcomeWall venueCode={venueCode} wall={venueWall} />
        </motion.div>
      )}
      {showSeatingChart && (
        <motion.div
          key="venue-seating-chart"
          className="relative z-10 min-h-screen w-full"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <VenueSeatingChart wall={venueWall} skipMountIntro={venueMosaicWasShownRef.current} />
        </motion.div>
      )}
      {showLeaderboard && (
        <motion.div
          key="venue-leaderboard"
          className="relative z-10 min-h-screen w-full"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <VenueLeaderboardWall
            wall={venueWall}
            skipMountIntro={venueMosaicWasShownRef.current}
            trophyMode={leaderboardTrophyMode}
          />
        </motion.div>
      )}
      {showRules && (
        <motion.div
          key="venue-seating-rules"
          className="relative z-10 min-h-screen w-full"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <VenueSeatingRulesWall skipMountIntro={venueMosaicWasShownRef.current} />
        </motion.div>
      )}
      {showVenueMosaicShell && (
        <motion.div
          key="venue-wall-shell"
          className="relative z-10 min-h-screen w-full bg-[#050806]"
          role="presentation"
          initial={venueMosaicWasShownRef.current ? false : { opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: venueMosaicWasShownRef.current ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <VenueEightTablesPreview
            wall={venueWall}
            skipMountIntro={venueMosaicWasShownRef.current}
            hostFocusTable={layout.focusTable}
          />
        </motion.div>
      )}
    </AnimatePresence>
    <AnimatePresence>
      {bustAnnouncement.visible && bustAnnouncement.busts.length > 0 ? (
        <VenueBustAnnouncement key="venue-bust-announcement" busts={bustAnnouncement.busts} />
      ) : null}
      {seatingAnnouncement.visible &&
      seatingAnnouncement.seating != null &&
      venueSeatingAnnouncementHasContent(seatingAnnouncement.seating) ? (
        <VenueSeatingAnnouncement
          key={`venue-seating-${venueWall?.lastHandEndMs ?? 'x'}`}
          seating={seatingAnnouncement.seating}
        />
      ) : null}
    </AnimatePresence>
    </>
  )
}
