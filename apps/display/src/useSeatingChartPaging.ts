import { useEffect, useState } from 'react'

/** Current page. A single page does not run a clock. The circle animation uses the same duration. */
export function usePagingCountdown(pageCount: number, durationMs: number, resetKey: string | number): number {
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [resetKey, pageCount])

  useEffect(() => {
    if (pageCount <= 1) return
    const id = window.setTimeout(() => {
      setPageIndex((current) => (current + 1) % pageCount)
    }, durationMs)
    return () => window.clearTimeout(id)
  }, [pageCount, durationMs, pageIndex])

  return pageIndex
}
