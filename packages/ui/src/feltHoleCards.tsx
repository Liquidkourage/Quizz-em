import type { Ref } from 'react'
import { clsx } from 'clsx'
import { NumericPlayingCard } from './NumericPlayingCard'
import { stadiumHoleCardOverlapPx } from './stadiumSeatLayout'

export type FeltHoleCardPairProps = {
  rotateDeg?: number
  /** Scale applied to {@link NumericPlayingCard} `small` (1 = card native size). */
  scale: number
  /** Horizontal offset of the second card; negative overlaps, positive spreads apart. */
  overlapPx?: number
  /** Fan angle (deg) applied ± to each card for readable side-by-side pairs. */
  fanDeg?: number
  faceDown?: boolean
  digits?: readonly [number, number] | null
  /** Ref callbacks per card slot — for deal-flight anchors in display hero. */
  cardRefs?: [
    ((el: HTMLDivElement | null) => void) | undefined,
    ((el: HTMLDivElement | null) => void) | undefined,
  ]
  className?: string
  hidden?: boolean
  variant?: 'emerald' | 'gold' | 'purple' | 'red' | 'blue' | 'cyan' | 'pink' | 'orange' | 'lime' | 'violet'
  animated?: boolean
}

/** Two fanned hole cards on the felt — rotated to face the rail at each seat. */
export function FeltHoleCardPair({
  rotateDeg = 0,
  scale,
  overlapPx: overlapPxProp,
  fanDeg = 0,
  faceDown = true,
  digits,
  cardRefs,
  className,
  hidden = false,
  variant = 'cyan',
  animated = false,
}: FeltHoleCardPairProps) {
  const overlapPx = overlapPxProp ?? stadiumHoleCardOverlapPx(scale)

  return (
    <div
      className={clsx('pointer-events-none flex items-end justify-center', className)}
      style={{
        transform: `rotate(${rotateDeg}deg)`,
        opacity: hidden ? 0 : undefined,
      }}
      aria-hidden={hidden || undefined}
    >
      {[0, 1].map((cardIndex) => (
        <div
          key={cardIndex}
          ref={cardRefs?.[cardIndex] as Ref<HTMLDivElement> | undefined}
          className="origin-bottom"
          style={{
            marginLeft: cardIndex === 0 ? 0 : overlapPx,
            transform: `scale(${scale}) rotate(${cardIndex === 0 ? -fanDeg : fanDeg}deg)`,
          }}
        >
          <NumericPlayingCard
            digit={digits?.[cardIndex] ?? 0}
            variant={variant}
            size="small"
            faceDown={faceDown}
            animated={animated}
            backDesign="star"
            compact
          />
        </div>
      ))}
    </div>
  )
}
