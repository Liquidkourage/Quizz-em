import { useEffect, useState } from 'react'
import {
  seatingChartPageSizeForViewport,
  SEATING_CHART_PAGE_TABLES,
} from './venueSeatingChartCarousel'

/** Responsive placards-per-page for the venue seating wall (3 wide / 2 narrow). */
export function useSeatingChartPageSize(): number {
  const [pageSize, setPageSize] = useState(() =>
    typeof window !== 'undefined'
      ? seatingChartPageSizeForViewport(window.innerWidth)
      : SEATING_CHART_PAGE_TABLES,
  )

  useEffect(() => {
    const sync = () => setPageSize(seatingChartPageSizeForViewport(window.innerWidth))
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return pageSize
}
