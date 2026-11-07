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

/** Gap between the player's own cards so both digits stay fully visible. */
const PLAYER_FELT_CLEAR_GAP_PX = 6

function playerFeltHoleClassName(faceDown: boolean, className: string | undefined): string {
  const upright = faceDown ? '' : 'player-felt-card-face'
  return [upright, className].filter(Boolean).join(' ')
}

function holeCardBox(w: number, h: number, extra: CSSProperties): CSSProperties {
  return {
    width: w,
    height: h,
    borderRadius: Math.max(4, Math.round(Math.min(w, h) * 0.12)),
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
    ...extra,
  }
}

/** The player's own cards: upright, side by side, neither one covering the other. */
function ClearHoleCards({
  scale,
  digits,
  className,
  hidden = false,
}: PlayerFeltHoleCardsProps) {
  const { w, h } = playerHoleCardSizePx(scale)
  const orderedDigits = digits != null ? digitsAscending(digits) : null
  return (
    <div
      className={playerFeltHoleClassName(false, className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: w * 2 + PLAYER_FELT_CLEAR_GAP_PX,
        columnGap: PLAYER_FELT_CLEAR_GAP_PX,
        opacity: hidden ? 0 : undefined,
      }}
      aria-hidden={hidden || undefined}
      data-hole-layout="player-clear"
    >
      {[0, 1].map((cardIndex) => (
        <div key={cardIndex} style={holeCardBox(w, h, {})}>
          <CardFaceGraphic
            digit={orderedDigits?.[cardIndex] ?? 0}
            className="block h-full w-full object-cover"
            alt=""
          />
        </div>
      ))}
    </div>
  )
}

/** Other seats — two backs fanned from the rail, the same way as the public table. */
function SplayedHoleCards({
  scale,
  rotateDeg = 0,
  className,
  hidden = false,
}: PlayerFeltHoleCardsProps) {
  const { w, h } = playerHoleCardSizePx(scale)
  const overlap = playerFeltHoleOverlapPx(w)
  return (
    <div
      className={playerFeltHoleClassName(true, className)}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        width: w * 2 - overlap,
        opacity: hidden ? 0 : undefined,
        transform: `rotate(${rotateDeg}deg)`,
        transformOrigin: '50% 100%',
      }}
      aria-hidden={hidden || undefined}
      data-hole-layout="player-splay"
    >
      {[0, 1].map((cardIndex) => {
        const fan = cardIndex === 0 ? PLAYER_FELT_HOLE_FAN_DEG : -PLAYER_FELT_HOLE_FAN_DEG
        return (
          <div
            key={cardIndex}
            style={holeCardBox(w, h, {
              marginLeft: cardIndex === 1 ? -overlap : undefined,
              transformOrigin: '50% 100%',
              transform: `rotate(${fan}deg)`,
            })}
          >
            <CardBackSvg className="block h-full w-full" />
          </div>
        )
      })}
    </div>
  )
}

/** Player felt — own cards clear; every other pair splayed like the public table. */
export function PlayerFeltHoleCards(props: PlayerFeltHoleCardsProps) {
  if (props.faceDown === false) return <ClearHoleCards {...props} />
  return <SplayedHoleCards {...props} />
}

export function playerFeltHolePairWidthPx(scale: number): number {
  const { w } = playerHoleCardSizePx(scale)
  return w * 2 - playerFeltHoleOverlapPx(w)
}
