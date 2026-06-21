import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { FeltHoleCardPair } from './feltHoleCards'
import {
  STADIUM_CUPHOLDER_RADIAL,
  STADIUM_HOLE_CARDS_RADIAL,
  STADIUM_NAME_LABEL_RADIAL,
  stadiumCupholderSizePx,
  stadiumHoleCardScale,
  stadiumSeatPointPx,
} from './stadiumSeatLayout'
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
}: StadiumTableSeatsProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [ringPx, setRingPx] = useState({ w: 0, h: 0 })
  const seatMap = seatByIndex(seats)
  const count = Math.max(1, seatCount)

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
  const cupSizePx = stadiumCupholderSizePx(rimW)
  const holeScale = stadiumHoleCardScale(rimW)
  const showCenter =
    centerContent != null || (communityDigits != null && communityDigits.length > 0)

  return (
    <div
      ref={wrapRef}
      className={clsx('relative mx-auto w-full max-w-full', aspectClassName, className)}
      style={style}
    >
      <PokerTableGraphic className="absolute inset-0 h-full w-full drop-shadow-md" aria-hidden />

      {showCenter && rimW > 0 ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-[12] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
          aria-hidden={centerContent == null ? undefined : true}
        >
          {centerContent}
          {communityDigits != null && communityDigits.length > 0 ? (
            <div className="flex items-center gap-0.5">
              {communityDigits.slice(0, 5).map((digit, i) => (
                <CardFaceGraphic
                  key={i}
                  digit={digit}
                  className="shrink-0 rounded-[3px] shadow-sm"
                  style={{
                    width: Math.max(14, cupSizePx * 0.55),
                    height: Math.max(20, cupSizePx * 0.77),
                  }}
                  alt=""
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {rimW > 0 &&
        Array.from({ length: count }, (_, i) => {
          const seat = seatMap.get(i)
          if (hideEmptySeats && seat == null) return null

          const cupPt = stadiumSeatPointPx(i, count, rimW, rimH, STADIUM_CUPHOLDER_RADIAL)
          const holePt = stadiumSeatPointPx(i, count, rimW, rimH, STADIUM_HOLE_CARDS_RADIAL)
          const labelPt = stadiumSeatPointPx(i, count, rimW, rimH, STADIUM_NAME_LABEL_RADIAL)
          const state = seat?.state ?? (seat == null ? 'empty' : 'default')
          const showHoles = seat != null && seat.holeDigits != null && state !== 'folded'

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
                  state={state}
                  aria-label={seat?.['aria-label'] ?? (seat?.label != null ? String(seat.label) : `Seat ${i + 1}`)}
                />
              </div>

              {showHoles ? (
                <div
                  className="pointer-events-none absolute z-[18] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${holePt.leftPct}%`, top: `${holePt.topPct}%` }}
                >
                  <FeltHoleCardPair
                    rotateDeg={holePt.rotateDeg}
                    scale={holeScale}
                    faceDown={seat!.faceDown ?? true}
                    digits={seat!.holeDigits}
                    variant={seat!.holeVariant ?? 'cyan'}
                  />
                </div>
              ) : null}

              {seat?.nameTag != null ? (
                <div
                  className={clsx(
                    'pointer-events-none absolute z-[22] flex max-w-[42%] -translate-x-1/2 flex-col items-center text-center leading-tight',
                    seat.nameTagClassName
                  )}
                  style={{ left: `${labelPt.leftPct}%`, top: `${labelPt.topPct}%` }}
                >
                  {seat.nameTag}
                </div>
              ) : null}
            </div>
          )
        })}
    </div>
  )
}
