import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { FeltHoleCardPair } from './feltHoleCards'
import { PlayerFeltHoleCards } from './playerFeltHoleCards'
import {
  STADIUM_CUPHOLDER_RADIAL,
  STADIUM_HOLE_CARDS_RADIAL,
  STADIUM_NAME_LABEL_RADIAL,
  stadiumCupholderSizePx,
  stadiumHoleCardScale,
  stadiumPlayerCommunityCardSizePx,
  stadiumPlayerCupholderSizePx,
  stadiumPlayerHoleCardScale,
  stadiumPlayerSeatHoleCardScale,
  stadiumSeatPointPx,
  type StadiumFeltLayout,
} from './stadiumSeatLayout'
import {
  MOSAIC_SEAT_COUNT,
  mosaicFeltCenterPct,
  mosaicSeatDotPct,
  mosaicSeatHoleLayout,
  mosaicSeatLabelPct,
  mosaicSeatPlayerHoleInwardFrac,
} from './mosaicSeatGeometry'
import { CardFaceGraphic } from './CardFaceGraphic'
import { PokerTableGraphic, SeatCupholderMarker, type SeatCupholderState } from './tableGraphics'

export type StadiumTableSeat = {
  /** 0-based seat index around the table (clock top, CCW). */
  index: number
  label?: ReactNode
  labelClassName?: string
  nameTag?: ReactNode
  nameTagClassName?: string
  state?: SeatCupholderState
  holeDigits?: readonly [number, number] | null
  /** Face-down pair when the digits are withheld. */
  holeBacks?: boolean
  faceDown?: boolean
  holeVariant?: 'emerald' | 'gold' | 'purple' | 'red' | 'blue' | 'cyan' | 'pink' | 'orange' | 'lime' | 'violet'
  'aria-label'?: string
}

export type StadiumTableSeatsProps = {
  /** Number of seats distributed around the rail (usually player count or 8). */
  seatCount: number
  seats: StadiumTableSeat[]
  /** Slot indexes with no player — hide cupholders when empty. */
  hideEmptySeats?: boolean
  /** Optional community board digits in the felt center. */
  communityDigits?: readonly number[]
  centerContent?: ReactNode
  className?: string
  style?: CSSProperties
  aspectClassName?: string
  /** `player` — display-table mosaic seat anchors + phone-readable sizes. */
  feltLayout?: StadiumFeltLayout
}

/** Grow a phone seat tag away from the felt so it stays in the gutter, off the cards. */
function playerSeatLabelTransform(
  label: { leftPct: number; topPct: number },
  w: number,
  h: number
): string {
  const center = w > 0 && h > 0 ? mosaicFeltCenterPct(w, h) : { leftPct: 50, topPct: 50 }
  const dx = label.leftPct - center.leftPct
  const dy = label.topPct - center.topPct
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  if (absDx > absDy * 1.05) return dx > 0 ? 'translate(0%, -50%)' : 'translate(-100%, -50%)'
  if (absDy > absDx * 1.05) return dy > 0 ? 'translate(-50%, 0%)' : 'translate(-50%, -100%)'
  return `translate(${dx > 0 ? '0%' : '-100%'}, ${dy > 0 ? '0%' : '-100%'})`
}

function seatByIndex(seats: StadiumTableSeat[]): Map<number, StadiumTableSeat> {
  const map = new Map<number, StadiumTableSeat>()
  for (const seat of seats) map.set(seat.index, seat)
  return map
}

/** Top-down stadium table — proportional cupholders, rotated hole cards, optional center board. */
export function StadiumTableSeats({
  seatCount,
  seats,
  hideEmptySeats = false,
  communityDigits,
  centerContent,
  className,
  style,
  aspectClassName = 'aspect-[8/5]',
  feltLayout = 'default',
}: StadiumTableSeatsProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [ringPx, setRingPx] = useState({ w: 0, h: 0 })
  const seatMap = seatByIndex(seats)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const apply = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        setRingPx((prev) =>
          prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }
        )
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w: rimW, h: rimH } = ringPx
  const isPlayerLayout = feltLayout === 'player'
  /** Player felt always uses the same 8 physical chairs as the venue display tables. */
  const count = isPlayerLayout ? MOSAIC_SEAT_COUNT : Math.max(1, seatCount)
  /** Size chrome by how many seats are occupied — not always 8 empty chairs. */
  const occupiedForSizing = Math.max(1, Math.min(count, seats.length || seatCount || 1))
  const cupSizePx = isPlayerLayout ? stadiumPlayerCupholderSizePx(rimW) : stadiumCupholderSizePx(rimW)
  const holeScale = isPlayerLayout
    ? stadiumPlayerHoleCardScale(rimW, occupiedForSizing)
    : stadiumHoleCardScale(rimW)
  const cupLabelFontPx = isPlayerLayout
    ? Math.max(13, Math.round(cupSizePx * (rimW > 0 && rimW < 420 ? 0.42 : 0.44)))
    : undefined
  const communityCardSize = isPlayerLayout
    ? stadiumPlayerCommunityCardSizePx(rimW, occupiedForSizing)
    : null
  const showCenter =
    centerContent != null || (communityDigits != null && communityDigits.length > 0)
  // Name/stack sit fully outside the rail — must clear hole-card height, not just the cup.
  // Just outside the cup. The tag grows further outward into the phone gutter.
  const labelOutwardPx = isPlayerLayout ? Math.max(20, Math.round(cupSizePx * 0.95)) : 0

  return (
    <div
      className={clsx(
        'relative mx-auto w-full max-w-full',
        aspectClassName,
        className,
        isPlayerLayout && 'player-felt-frame'
      )}
      style={style}
    >
      <div ref={wrapRef} className={isPlayerLayout ? 'player-felt-stage' : 'absolute inset-0'}>
      <PokerTableGraphic className="absolute inset-0 h-full w-full drop-shadow-md" aria-hidden />

      {showCenter && rimW > 0 ? (
        <div
          className={clsx(
            'pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center',
            isPlayerLayout ? 'z-[24] gap-1.5' : 'z-[12] gap-0.5'
          )}
          aria-hidden={centerContent == null ? undefined : true}
        >
          {centerContent}
          {communityDigits != null && communityDigits.length > 0 ? (
            <div className={clsx('flex items-center', isPlayerLayout ? 'gap-1' : 'gap-0.5')}>
              {communityDigits.slice(0, 5).map((digit, i) => {
                const cardW = communityCardSize?.w ?? Math.max(14, cupSizePx * 0.55)
                const cardH = communityCardSize?.h ?? Math.max(20, cupSizePx * 0.77)
                return (
                  <div key={i} className="shrink-0" style={{ width: cardW, height: cardH }}>
                    <CardFaceGraphic
                      digit={digit}
                      className={clsx('block h-full w-full shadow-sm', isPlayerLayout ? 'rounded-[4px]' : 'rounded-[3px]')}
                      alt=""
                    />
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {rimW > 0 &&
        Array.from({ length: count }, (_, i) => {
          const seat = seatMap.get(i)
          if (hideEmptySeats && seat == null) return null

          const cupPt = isPlayerLayout
            ? mosaicSeatDotPct(i, count, rimW, rimH)
            : stadiumSeatPointPx(i, count, rimW, rimH, STADIUM_CUPHOLDER_RADIAL)
          const holeInward = mosaicSeatPlayerHoleInwardFrac(i)
          const holePt = isPlayerLayout
            ? mosaicSeatHoleLayout(
                i,
                count,
                rimW,
                rimH,
                rimW > 0 && rimW < 280 ? Math.min(0.42, holeInward + 0.1) : holeInward
              )
            : stadiumSeatPointPx(i, count, rimW, rimH, STADIUM_HOLE_CARDS_RADIAL)
          const labelPt = isPlayerLayout
            ? mosaicSeatLabelPct(i, rimW, rimH, labelOutwardPx)
            : stadiumSeatPointPx(i, count, rimW, rimH, STADIUM_NAME_LABEL_RADIAL)
          const state = seat?.state ?? (seat == null ? 'empty' : 'default')
          const showHoles =
            seat != null &&
            state !== 'folded' &&
            (seat.holeDigits != null || seat.holeBacks === true)
          const holesFaceUp = showHoles && seat!.holeDigits != null && !(seat!.faceDown ?? true)
          const seatHoleScale = isPlayerLayout
            ? stadiumPlayerSeatHoleCardScale(rimW, occupiedForSizing, holesFaceUp)
            : holeScale

          return (
            <div key={i}>
              <div
                className="absolute z-[20] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{ left: `${cupPt.leftPct}%`, top: `${cupPt.topPct}%` }}
              >
                <SeatCupholderMarker
                  sizePx={cupSizePx}
                  label={seat?.label}
                  labelClassName={seat?.labelClassName}
                  labelFontSizePx={cupLabelFontPx}
                  state={state}
                  aria-label={seat?.['aria-label'] ?? (seat?.label != null ? String(seat.label) : `Seat ${i + 1}`)}
                />
              </div>

              {showHoles ? (
                <div
                  className={clsx(
                    'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2',
                    // Face-up (hero) above board; face-down opponents stay under the community cards.
                    holesFaceUp ? 'z-[30]' : isPlayerLayout ? 'z-[16]' : 'z-[18]'
                  )}
                  style={{ left: `${holePt.leftPct}%`, top: `${holePt.topPct}%` }}
                >
                  {isPlayerLayout ? (
                    <PlayerFeltHoleCards
                      rotateDeg={holePt.rotateDeg}
                      scale={seatHoleScale}
                      faceDown={seat!.faceDown ?? seat!.holeDigits == null}
                      digits={seat!.holeDigits}
                    />
                  ) : (
                    <FeltHoleCardPair
                      rotateDeg={holePt.rotateDeg}
                      scale={seatHoleScale}
                      faceDown={seat!.faceDown ?? seat!.holeDigits == null}
                      digits={seat!.holeDigits}
                      variant={seat!.holeVariant ?? 'cyan'}
                    />
                  )}
                </div>
              ) : null}

              {seat?.nameTag != null ? (
                <div
                  className={clsx(
                    'pointer-events-none absolute z-[22] flex flex-col items-center text-center leading-tight',
                    isPlayerLayout
                      ? 'player-seat-tag'
                      : '-translate-x-1/2 max-w-[42%]',
                    seat.nameTagClassName
                  )}
                  style={{
                    left: `${labelPt.leftPct}%`,
                    top: `${labelPt.topPct}%`,
                    zIndex: isPlayerLayout ? 34 : undefined,
                    transform: isPlayerLayout ? playerSeatLabelTransform(labelPt, rimW, rimH) : undefined,
                  }}
                >
                  {seat.nameTag}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
