import type { Ref } from 'react'
import { clsx } from 'clsx'
import { CardBackSvg } from './CardBackSvg'
import { CardFaceGraphic } from './CardFaceGraphic'
import { NumericPlayingCard } from './NumericPlayingCard'
import { stadiumHoleCardOverlapPx } from './stadiumSeatLayout'

export type FeltHoleCardPairProps = {
  rotateDeg?: number
  /** Scale applied to {@link NumericPlayingCard} `small` (1 = card native size). */
  scale: number
  /** Horizontal offset of the second card; negative overlaps (legacy fan). Ignored when {@link gapPx} is set. */
  overlapPx?: number
  /** Flex gap between cards — each card is sized to scale with no transform bleed. */
  gapPx?: number
  /** Fan angle (deg) applied ± to each card (legacy overlap layout only). */
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

const CARD_SMALL_LAYOUT_WIDTH_PX = 64
const CARD_SMALL_LAYOUT_HEIGHT_PX = 96

function spreadCardSizePx(scale: number): { w: number; h: number } {
  return {
    w: Math.max(1, Math.round(CARD_SMALL_LAYOUT_WIDTH_PX * scale)),
    h: Math.max(1, Math.round(CARD_SMALL_LAYOUT_HEIGHT_PX * scale)),
  }
}

/** Two hole cards on the felt — rotated to face the rail at each seat. */
export function FeltHoleCardPair({
  rotateDeg = 0,
  scale,
  overlapPx: overlapPxProp,
  gapPx,
  fanDeg = 0,
  faceDown = true,
  digits,
  cardRefs,
  className,
  hidden = false,
  variant = 'cyan',
  animated = false,
}: FeltHoleCardPairProps) {
  void variant
  const overlapPx = overlapPxProp ?? stadiumHoleCardOverlapPx(scale)
  const spread = gapPx != null
  const spreadGapPx = spread ? gapPx : 0
  const spreadSize = spread ? spreadCardSizePx(scale) : null

  if (spread && spreadSize) {
    return (
      <div
        className={clsx('pointer-events-none flex items-end justify-center', className)}
        style={{
          transform: `rotate(${rotateDeg}deg)`,
          opacity: hidden ? 0 : undefined,
          gap: spreadGapPx,
        }}
        aria-hidden={hidden || undefined}
      >
        {[0, 1].map((cardIndex) => (
          <div
            key={cardIndex}
            ref={cardRefs?.[cardIndex] as Ref<HTMLDivElement> | undefined}
            className="relative shrink-0 overflow-hidden rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
            style={{ width: spreadSize.w, height: spreadSize.h }}
          >
            {faceDown ? (
              <CardBackSvg className="absolute inset-0 h-full w-full" />
            ) : (
              <CardFaceGraphic
                digit={digits?.[cardIndex] ?? 0}
                className="absolute inset-0 h-full w-full"
                alt=""
              />
            )}
          </div>
        ))}
      </div>
    )
  }

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
            marginLeft: cardIndex === 1 ? overlapPx : undefined,
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
