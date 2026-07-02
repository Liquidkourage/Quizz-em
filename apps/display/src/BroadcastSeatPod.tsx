import { FeltHoleCardPair, STADIUM_REFERENCE_TABLE_WIDTH_PX, stadiumHoleCardScale } from '@qhe/ui'
import { formatVenueBankroll } from './venueLeaderboard'
import {
  broadcastSeatPodTransform,
  broadcastSeatPodWidthPx,
  type BroadcastDensity,
} from './venueMosaicSeatGeometry'

export type BroadcastSeatPodState = 'active' | 'acting' | 'folded' | 'out' | 'all-in'

export function BroadcastSeatPod({
  name,
  bankroll,
  state,
  holeDigits,
  rimW,
  density,
  leftPct,
  topPct,
  prefersReducedMotion: _prefersReducedMotion,
}: {
  name: string
  bankroll: number
  state: BroadcastSeatPodState
  holeDigits?: readonly [number, number] | null
  rimW: number
  density: BroadcastDensity
  leftPct: number
  topPct: number
  prefersReducedMotion: boolean
}) {
  const podWidthPx = broadcastSeatPodWidthPx(rimW, density)
  const transform = broadcastSeatPodTransform({ leftPct, topPct }, rimW, rimHFromWidth(rimW))
  const holeScale = Math.max(0.42, Math.min(0.72, stadiumHoleCardScale(rimW) * (density === 'dual' ? 0.58 : 0.64)))
  const isOut = state === 'out'
  const isFolded = state === 'folded' || isOut
  const showCards = !isFolded && holeDigits != null
  const showChipsRow = !isOut

  return (
    <div
      className={`vfd-broadcast-seat-pod pointer-events-none absolute ${SEAT_LAYER_BROADCAST_POD} ${
        state === 'acting' ? 'vfd-broadcast-seat-pod--acting' : ''
      } ${isOut ? 'vfd-broadcast-seat-pod--out' : isFolded ? 'vfd-broadcast-seat-pod--folded' : ''}`}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform,
        width: `${podWidthPx}px`,
      }}
      aria-label={`${name}, ${formatVenueBankroll(bankroll)}${isOut ? ', out' : state === 'acting' ? ', acting' : ''}`}
    >
      <div className="vfd-broadcast-seat-pod__shell">
        <div className="vfd-broadcast-seat-pod__header">
          <span className="vfd-broadcast-seat-pod__name" title={name}>
            {name}
          </span>
          {showChipsRow ? (
            <span
              className={`vfd-broadcast-seat-pod__bankroll${
                isFolded ? ' vfd-broadcast-seat-pod__bankroll--muted' : ''
              }`}
            >
              {formatVenueBankroll(bankroll)}
            </span>
          ) : null}
        </div>

        {isOut ? (
          <div className="vfd-broadcast-seat-pod__status-row">
            <span className="vfd-broadcast-seat-pod__badge vfd-broadcast-seat-pod__badge--out">Out</span>
          </div>
        ) : state === 'all-in' ? (
          <div className="vfd-broadcast-seat-pod__status-row">
            <span className="vfd-broadcast-seat-pod__badge vfd-broadcast-seat-pod__badge--all-in">
              All-in
            </span>
          </div>
        ) : state === 'folded' ? (
          <div className="vfd-broadcast-seat-pod__status-row">
            <span className="vfd-broadcast-seat-pod__badge vfd-broadcast-seat-pod__badge--folded">
              Folded
            </span>
          </div>
        ) : showCards ? (
          <div className="vfd-broadcast-seat-pod__cards" aria-hidden>
            <FeltHoleCardPair rotateDeg={0} scale={holeScale} faceDown digits={holeDigits} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Broadcast pods sit above rim labels — approximate felt height from width (14:8). */
function rimHFromWidth(rimW: number): number {
  return rimW > 0 ? (rimW * 8) / 14 : STADIUM_REFERENCE_TABLE_WIDTH_PX * (8 / 14)
}

export const SEAT_LAYER_BROADCAST_POD = 'z-[122]'
