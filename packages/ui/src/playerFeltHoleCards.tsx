import type { CSSProperties } from 'react'
import { CardBackSvg } from './CardBackSvg'
import { CardFaceGraphic } from './CardFaceGraphic'

/** Gap between the two player hole cards — never overlap. */
export const PLAYER_FELT_HOLE_CARD_GAP_PX = 6

const CARD_SMALL_WIDTH_PX = 64
const CARD_SMALL_HEIGHT_PX = 96

export type PlayerFeltHoleCardsProps = {
  scale: number
  rotateDeg?: number
  faceDown?: boolean
  digits?: readonly [number, number] | null
  className?: string
  hidden?: boolean
}

function playerHoleCardSizePx(scale: number): { w: number; h: number } {
  return {
    w: Math.max(1, Math.round(CARD_SMALL_WIDTH_PX * scale)),
    h: Math.max(1, Math.round(CARD_SMALL_HEIGHT_PX * scale)),
  }
}

/** Player felt — two hole cards in a fixed grid; no overlap layout path. */
export function PlayerFeltHoleCards({
  scale,
  rotateDeg = 0,
  faceDown = true,
  digits,
  className,
  hidden = false,
}: PlayerFeltHoleCardsProps) {
  const { w, h } = playerHoleCardSizePx(scale)
  const pairWidth = w * 2 + PLAYER_FELT_HOLE_CARD_GAP_PX
  const radius = Math.max(4, Math.round(Math.min(w, h) * 0.12))

  const shellStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${w}px ${w}px`,
    columnGap: PLAYER_FELT_HOLE_CARD_GAP_PX,
    width: pairWidth,
    transform: `rotate(${rotateDeg}deg)`,
    opacity: hidden ? 0 : undefined,
  }

  return (
    <div
      className={className}
      style={shellStyle}
      aria-hidden={hidden || undefined}
      data-hole-layout="player-spread"
    >
      {[0, 1].map((cardIndex) => (
        <div
          key={cardIndex}
          style={{
            width: w,
            height: h,
            borderRadius: radius,
            overflow: 'hidden',
            boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
          }}
        >
          {faceDown ? (
            <CardBackSvg className="block h-full w-full" />
          ) : (
            <CardFaceGraphic
              digit={digits?.[cardIndex] ?? 0}
              className="block h-full w-full object-cover"
              alt=""
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function playerFeltHolePairWidthPx(scale: number): number {
  const { w } = playerHoleCardSizePx(scale)
  return w * 2 + PLAYER_FELT_HOLE_CARD_GAP_PX
}
