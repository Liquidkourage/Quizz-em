import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const MUCK_MS = 900

/**
 * A fold that should slide the hole cards toward the middle.
 * The public snapshot removes the cards in the same update that marks the fold.
 */
export function holeMuckStarts(
  wasShowing: boolean,
  folded: boolean,
  dealt: boolean,
  reducedMotion: boolean,
): boolean {
  const showing = dealt && !folded
  return wasShowing && !showing && folded && !reducedMotion
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
  const wasShowing = useRef(false)

  useLayoutEffect(() => {
    const hadCards = wasShowing.current
    wasShowing.current = dealt && !folded
    if (!holeMuckStarts(hadCards, folded, dealt, reducedMotion)) return
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
