import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const MUCK_MS = 600

/** A fold that should slide the hole cards toward the middle. */
export function holeMuckStarts(
  wasFolded: boolean,
  folded: boolean,
  dealt: boolean,
  reducedMotion: boolean,
): boolean {
  return dealt && !reducedMotion && folded && !wasFolded
}

/** Keeps folded hole cards on the felt just long enough to slide toward the pot. */
export function FoldingHoleCards({
  folded,
  dealt,
  reducedMotion,
  className,
  style,
  children,
}: {
  folded: boolean
  dealt: boolean
  reducedMotion: boolean
  className: string
  style: CSSProperties
  children: ReactNode
}) {
  const [leaving, setLeaving] = useState(false)
  const prevFolded = useRef(folded)

  useLayoutEffect(() => {
    const wasFolded = prevFolded.current
    prevFolded.current = folded
    if (!holeMuckStarts(wasFolded, folded, dealt, reducedMotion)) return
    setLeaving(true)
    const timer = window.setTimeout(() => setLeaving(false), MUCK_MS)
    return () => window.clearTimeout(timer)
  }, [folded, dealt, reducedMotion])

  if (dealt && !folded) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
  if (!leaving) return null
  return (
    <div className={`${className} vfd-hole-muck`} style={style}>
      {children}
    </div>
  )
}
