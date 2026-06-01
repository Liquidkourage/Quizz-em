import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DisplayLayoutPayload, DisplayVenueWallSnapshot } from '@qhe/net'
import {
  buildVenueWallTileRows,
  floorFeaturedTileIndex,
  SHOWDOWN_SPOTLIGHT_CYCLE_SEC,
  shouldRotateShowdownTour,
  showdownTableNums,
  venueWallHasLiveTiles,
} from './venueWallModel'

function venueSpotlightFromLayout(layout: DisplayLayoutPayload): number | null {
  if (layout.focusTable != null && Number.isFinite(layout.focusTable)) {
    return layout.focusTable
  }
  return null
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export type VenueFeaturedWatch = {
  featuredTableNum: number | null
  tileRowsLength: number
  showShowdownTour: boolean
  showdownTourIndex: number
  showdownCycleProgress: number
}

export function useVenueWallFeaturedWatch(
  wall: DisplayVenueWallSnapshot | null,
  layout: DisplayLayoutPayload
): VenueFeaturedWatch {
  const tileRows = useMemo(() => {
    if (!venueWallHasLiveTiles(wall)) return []
    return buildVenueWallTileRows(wall)
  }, [wall])
  const fingerprint = tileRows.map((t) => `${t.tableNum}:${t.phase}`).join('|')
  const hostSpot = venueSpotlightFromLayout(layout)
  const showdownNums = useMemo(() => showdownTableNums(tileRows), [fingerprint])
  const showShowdownTour = shouldRotateShowdownTour(tileRows, hostSpot)

  const prefersReducedMotion = usePrefersReducedMotion()
  const [showdownTourIndex, setShowdownTourIndex] = useState(0)
  const [showdownCycleTick, setShowdownCycleTick] = useState(0)
  const showdownCycleStartRef = useRef(0)

  const floorIdx = useMemo(() => floorFeaturedTileIndex(tileRows), [fingerprint])

  useEffect(() => {
    setShowdownTourIndex((i) => Math.min(i, Math.max(0, showdownNums.length - 1)))
  }, [showdownNums.length])

  useEffect(() => {
    if (!showShowdownTour || prefersReducedMotion || showdownNums.length <= 1) return undefined
    const id = window.setInterval(() => {
      setShowdownTourIndex((i) => (i + 1) % showdownNums.length)
    }, SHOWDOWN_SPOTLIGHT_CYCLE_SEC * 1000)
    return () => window.clearInterval(id)
  }, [showShowdownTour, prefersReducedMotion, showdownNums.length])

  useLayoutEffect(() => {
    showdownCycleStartRef.current = Date.now()
  }, [showdownTourIndex])

  useEffect(() => {
    if (!showShowdownTour || prefersReducedMotion || showdownNums.length <= 1) return undefined
    const id = window.setInterval(() => setShowdownCycleTick((n) => n + 1), 50)
    return () => window.clearInterval(id)
  }, [showShowdownTour, prefersReducedMotion, showdownNums.length, showdownTourIndex])

  const showdownCycleProgress = useMemo(() => {
    if (prefersReducedMotion || showdownNums.length <= 1) return 0
    const elapsed = Date.now() - showdownCycleStartRef.current
    return Math.min(1, elapsed / (SHOWDOWN_SPOTLIGHT_CYCLE_SEC * 1000))
  }, [showdownCycleTick, showdownTourIndex, prefersReducedMotion, showdownNums.length])

  const featuredTableNum = (() => {
    if (tileRows.length === 0) return null
    if (showShowdownTour) {
      return showdownNums[showdownTourIndex] ?? showdownNums[0] ?? tileRows[0]!.tableNum
    }
    if (hostSpot != null) return hostSpot
    if (showdownNums.length > 0) return showdownNums[0]!
    if (tileRows.every((t) => t.phase === 'lobby')) return null
    return tileRows[floorIdx]?.tableNum ?? tileRows[0]!.tableNum
  })()

  return {
    featuredTableNum,
    tileRowsLength: tileRows.length,
    showShowdownTour,
    showdownTourIndex,
    showdownCycleProgress,
  }
}
