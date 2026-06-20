import { useCallback, useEffect, useRef, useState } from 'react'
import type { VenueLeaderboardPresentationModel } from './venueLeaderboardPresentation'
import { venueLeaderboardPageDwellMs } from './venueLeaderboardPresentation'

/**
 * Public-display pager — mirrors seating-chart carousel conventions.
 * Resets on page-count changes, not on every stack tick.
 */
export function useVenueLeaderboardPager(presentation: VenueLeaderboardPresentationModel | null) {
  const pageCount = presentation?.pages.length ?? 0
  const [pageIndex, setPageIndex] = useState(0)
  const manualHoldRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleNext = useCallback(
    (fromIndex: number) => {
      clearTimer()
      if (pageCount <= 1) return
      const pageNumber = fromIndex + 1
      const dwell = venueLeaderboardPageDwellMs(pageNumber)
      timerRef.current = window.setTimeout(() => {
        manualHoldRef.current = false
        setPageIndex((current) => (current + 1) % pageCount)
      }, dwell)
    },
    [clearTimer, pageCount]
  )

  useEffect(() => {
    setPageIndex(0)
    manualHoldRef.current = false
  }, [pageCount])

  useEffect(() => {
    if (pageCount <= 1) {
      clearTimer()
      return
    }
    if (manualHoldRef.current) {
      scheduleNext(pageIndex)
      return
    }
    scheduleNext(pageIndex)
    return clearTimer
  }, [pageIndex, pageCount, scheduleNext, clearTimer])

  const goToPage = useCallback(
    (nextIndex: number) => {
      if (pageCount <= 1) return
      manualHoldRef.current = true
      const safe = ((nextIndex % pageCount) + pageCount) % pageCount
      setPageIndex(safe)
    },
    [pageCount]
  )

  const goNext = useCallback(() => goToPage(pageIndex + 1), [goToPage, pageIndex])
  const goPrev = useCallback(() => goToPage(pageIndex - 1), [goToPage, pageIndex])

  useEffect(() => {
    if (pageCount <= 1) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, pageCount])

  const currentPage = presentation?.pages[pageIndex] ?? null

  return {
    pageIndex,
    pageCount,
    currentPage,
    goNext,
    goPrev,
    showPager: pageCount > 1,
  }
}
