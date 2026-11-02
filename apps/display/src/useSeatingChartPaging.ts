import { useEffect, useState } from 'react'
import { pagedCountdownTick, seatingChartDwellSeconds } from './venueSeatingChartCarousel'

/** Page index plus the seconds left on that page. A single page does not run a clock. */
export function usePagingCountdown(
  pageCount: number,
  durationMs: number,
  resetKey: string | number,
): { pageIndex: number; secondsLeft: number } {
  const dwellSeconds = seatingChartDwellSeconds(durationMs)
  const [paging, setPaging] = useState(() => ({
    pageIndex: 0,
    secondsLeft: pageCount <= 1 ? 0 : dwellSeconds,
  }))

  useEffect(() => {
    setPaging({ pageIndex: 0, secondsLeft: pageCount <= 1 ? 0 : dwellSeconds })
  }, [resetKey, pageCount, dwellSeconds])

  useEffect(() => {
    if (pageCount <= 1) return
    const id = window.setInterval(() => {
      setPaging((current) => pagedCountdownTick(current, pageCount, dwellSeconds))
    }, 1000)
    return () => window.clearInterval(id)
  }, [pageCount, dwellSeconds])

  return paging
}
