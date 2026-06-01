import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import type { VenueFeaturedWatch } from './useVenueWallFeaturedWatch'
import {
  buildVenueWallViewPlaylist,
  venueActionTickerLines,
  VENUE_WALL_VIEW_LABELS,
  type VenueWallViewId,
} from './venueWallViewCycle'

export type VenueWallViewCycle = {
  activeView: VenueWallViewId
  activeLabel: string
  playlistKey: string
  cycling: boolean
  cycleProgress: number
  dwellMs: number
  viewIndex: number
  viewCount: number
  tickerLines: string[]
}

export function useVenueWallViewCycle(args: {
  tileRows: DisplayVenueTileSnapshot[]
  featuredWatch: VenueFeaturedWatch
  hostFocusTable: number | null
  headlineAnswering: boolean
  answerDeadlineMs: number | null
  prefersReducedMotion: boolean
}): VenueWallViewCycle {
  const {
    tileRows,
    featuredWatch,
    hostFocusTable,
    headlineAnswering,
    answerDeadlineMs,
    prefersReducedMotion,
  } = args

  const playlist = useMemo(
    () =>
      buildVenueWallViewPlaylist({
        tileRows,
        hostFocusTable,
        showShowdownTour: featuredWatch.showShowdownTour,
        headlineAnswering,
        answerDeadlineMs,
      }),
    [
      tileRows,
      hostFocusTable,
      featuredWatch.showShowdownTour,
      headlineAnswering,
      answerDeadlineMs,
    ],
  )

  const [viewIndex, setViewIndex] = useState(0)
  const [cycleTick, setCycleTick] = useState(0)
  const cycleStartRef = useRef(0)

  useEffect(() => {
    setViewIndex(0)
  }, [playlist.key])

  const cycling =
    !playlist.locked && !prefersReducedMotion && playlist.views.length > 1

  useEffect(() => {
    if (!cycling) return undefined
    const id = window.setInterval(() => {
      setViewIndex((i) => (i + 1) % playlist.views.length)
    }, playlist.dwellMs)
    return () => window.clearInterval(id)
  }, [cycling, playlist.dwellMs, playlist.views.length, playlist.key])

  useLayoutEffect(() => {
    cycleStartRef.current = Date.now()
  }, [viewIndex, playlist.key])

  useEffect(() => {
    if (!cycling) return undefined
    const id = window.setInterval(() => setCycleTick((n) => n + 1), 50)
    return () => window.clearInterval(id)
  }, [cycling, viewIndex, playlist.key])

  const cycleProgress = useMemo(() => {
    if (!cycling) return 0
    const elapsed = Date.now() - cycleStartRef.current
    return Math.min(1, elapsed / playlist.dwellMs)
  }, [cycleTick, cycling, playlist.dwellMs, viewIndex])

  const activeView = playlist.views[viewIndex] ?? 'floor'
  const tickerLines = useMemo(() => venueActionTickerLines(tileRows), [tileRows])

  return {
    activeView,
    activeLabel: VENUE_WALL_VIEW_LABELS[activeView],
    playlistKey: playlist.key,
    cycling,
    cycleProgress,
    dwellMs: playlist.dwellMs,
    viewIndex,
    viewCount: playlist.views.length,
    tickerLines,
  }
}
