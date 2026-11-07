import type { CSSProperties } from 'react'
import { digitsAscending } from './digitCardOrder'
import { CardBackSvg } from './CardBackSvg'
import { CardFaceGraphic } from './CardFaceGraphic'

/** Same fan the public mosaic uses: each card opens 8° off the rail. */
export const PLAYER_FELT_HOLE_FAN_DEG = 8

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

/** Second card covers about a third of the first, matching the public felt. */
export function playerFeltHoleOverlapPx(cardWidthPx: number): number {
  return Math.max(3, Math.round(cardWidthPx * 0.36))
}

function playerFeltHoleClassName(faceDown: boolean, className: string | undefined): string {
  const upright = faceDown ? '' : 'player-felt-card-face'
  return [upright, className].filter(Boolean).join(' ')
}

/** Player felt — two hole cards fanned from the rail, the same way as the public table. */
export function PlayerFeltHoleCards({
  scale,
  rotateDeg = 0,
  faceDown = true,
  digits,
  className,
  hidden = false,
}: PlayerFeltHoleCardsProps) {
  const { w, h } = playerHoleCardSizePx(scale)
  const orderedDigits = digits != null ? digitsAscending(digits) : null
  const overlap = playerFeltHoleOverlapPx(w)
  const radius = Math.max(4, Math.round(Math.min(w, h) * 0.12))
  const shellStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: w * 2 - overlap,
    opacity: hidden ? 0 : undefined,
    transform: faceDown ? `rotate(${rotateDeg}deg)` : undefined,
    transformOrigin: '50% 100%',
  }

  return (
    <div
      className={playerFeltHoleClassName(faceDown, className)}
      style={shellStyle}
      aria-hidden={hidden || undefined}
      data-hole-layout="player-splay"
    >
      {[0, 1].map((cardIndex) => {
        const fan = cardIndex === 0 ? PLAYER_FELT_HOLE_FAN_DEG : -PLAYER_FELT_HOLE_FAN_DEG
        return (
          <div
            key={cardIndex}
            style={{
              width: w,
              height: h,
              marginLeft: cardIndex === 1 ? -overlap : undefined,
              transformOrigin: '50% 100%',
              transform: `rotate(${fan}deg)`,
              borderRadius: radius,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
            }}
          >
            {faceDown ? (
              <CardBackSvg className="block h-full w-full" />
            ) : (
              <CardFaceGraphic
                digit={orderedDigits?.[cardIndex] ?? 0}
                className="block h-full w-full object-cover"
                alt=""
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function playerFeltHolePairWidthPx(scale: number): number {
  const { w } = playerHoleCardSizePx(scale)
  return w * 2 - playerFeltHoleOverlapPx(w)
}
