import { useLayoutEffect, useRef, useState } from 'react'

const MIN_FONT_VH = 0.028

function vhToPx(vhFraction: number): number {
  if (typeof window === 'undefined') return vhFraction * 900
  return window.innerHeight * vhFraction
}

function fitFontSizePx(
  el: HTMLElement,
  host: HTMLElement,
  maxFontPx: number,
  minFontPx: number
): number {
  const maxH = host.clientHeight
  if (!(maxH > 0 && maxFontPx > 0)) return maxFontPx

  let lo = minFontPx
  let hi = maxFontPx
  let best = minFontPx

  while (hi - lo > 0.35) {
    const mid = (lo + hi) / 2
    el.style.fontSize = `${mid}px`
    if (el.scrollHeight <= maxH + 1) {
      best = mid
      lo = mid
    } else {
      hi = mid
    }
  }

  if (el.scrollHeight > maxH + 1) {
    let emergency = best
    while (emergency > 11 && el.scrollHeight > maxH + 1) {
      emergency -= 0.5
      el.style.fontSize = `${emergency}px`
    }
    best = emergency
  }

  return best
}

export type DisplayFitQuestionTextProps = {
  text: string
  /** Outer box — fixed max-height via CSS; font scales to fit all text inside. */
  hostClassName?: string
  /** Typography, color, line-height — not font-size (set by fit). */
  textClassName: string
  /** Largest font before shrinking (viewport height fraction). */
  maxFontVh: number
  minFontVh?: number
}

/** Scale question copy down so the full string fits inside a capped headline box. */
export function DisplayFitQuestionText({
  text,
  hostClassName = 'display-fit-question-host',
  textClassName,
  maxFontVh,
  minFontVh = MIN_FONT_VH,
}: DisplayFitQuestionTextProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [fontPx, setFontPx] = useState<number | null>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    const el = textRef.current
    if (!host || !el) return

    const run = () => {
      const trimmed = text.trim()
      if (!trimmed) {
        setFontPx(null)
        el.style.fontSize = ''
        return
      }

      const maxPx = vhToPx(maxFontVh)
      const minPx = vhToPx(minFontVh)
      const fitted = fitFontSizePx(el, host, maxPx, minPx)
      el.style.fontSize = `${fitted}px`
      setFontPx(fitted)
    }

    run()
    const ro = new ResizeObserver(run)
    ro.observe(host)
    return () => ro.disconnect()
  }, [text, maxFontVh, minFontVh])

  return (
    <div ref={hostRef} className={hostClassName}>
      <p
        ref={textRef}
        className={textClassName}
        style={fontPx != null ? { fontSize: `${fontPx}px` } : undefined}
      >
        {text}
      </p>
    </div>
  )
}
