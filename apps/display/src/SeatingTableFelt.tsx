import { useLayoutEffect, useRef, useState } from 'react'
import { mosaicSeatDotPct, venueMosaicFeltCenterPct } from './venueMosaicSeatGeometry'
import { capsuleBorderRadiusCss } from './tableRimGeometry'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

const FELT_INSET = { top: 0.1, right: 0.06, bottom: 0.13, left: 0.06 }

function seatLabelOutwardPct(
  seatIndex: number,
  w: number,
  h: number,
  outward = 0.78
): { leftPct: number; topPct: number; anchor: string } {
  const dot = mosaicSeatDotPct(seatIndex, VENUE_WALL_SEAT_SLOTS, w, h)
  const center = venueMosaicFeltCenterPct()
  const dx = dot.leftPct - center.leftPct
  const dy = dot.topPct - center.topPct
  const anchor =
    Math.abs(dy) >= Math.abs(dx)
      ? dy < 0
        ? 'translate(-50%, -100%)'
        : 'translate(-50%, 0%)'
      : dx < 0
        ? 'translate(-100%, -50%)'
        : 'translate(0%, -50%)'
  return {
    leftPct: dot.leftPct + dx * outward,
    topPct: dot.topPct + dy * outward,
    anchor,
  }
}

function splitSeatingDisplayName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

export type SeatingTableFeltSeat = {
  seatNum: number
  name: string
}

export default function SeatingTableFelt({ seats }: { seats: SeatingTableFeltSeat[] }) {
  const ringRef = useRef<HTMLDivElement>(null)
  const [ringPx, setRingPx] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ringRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 }
      setRingPx({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w: rimW, h: rimH } = ringPx
  const railRadius = rimW > 0 && rimH > 0 ? capsuleBorderRadiusCss(rimW, rimH) : '50% / 50%'
  const feltRadius =
    rimW > 0 && rimH > 0
      ? capsuleBorderRadiusCss(
          rimW * (1 - FELT_INSET.left - FELT_INSET.right),
          rimH * (1 - FELT_INSET.top - FELT_INSET.bottom)
        )
      : '50% / 50%'

  return (
    <div
      ref={ringRef}
      className="relative mx-auto aspect-[8/5] w-full max-w-full"
      role="img"
      aria-label={`Table with ${seats.length} seated players`}
    >
      <div
        className="absolute inset-0 border-2 border-amber-700/90 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 shadow-md"
        style={{ borderRadius: railRadius }}
      />
      <div
        className="absolute border-2 border-amber-700/70 shadow-inner"
        style={{
          top: `${FELT_INSET.top * 100}%`,
          right: `${FELT_INSET.right * 100}%`,
          bottom: `${FELT_INSET.bottom * 100}%`,
          left: `${FELT_INSET.left * 100}%`,
          borderRadius: feltRadius,
          background: `
            repeating-linear-gradient(
              45deg,
              #245c36 0px,
              #245c36 2px,
              #1b4528 2px,
              #1b4528 4px
            ),
            linear-gradient(135deg, #2d7a4a, #1e502e)
          `,
        }}
      />

      {seats.map((seat) => {
        const seatIndex = seat.seatNum - 1
        if (seatIndex < 0 || seatIndex >= VENUE_WALL_SEAT_SLOTS) return null
        const dot = mosaicSeatDotPct(seatIndex, VENUE_WALL_SEAT_SLOTS, rimW, rimH)
        const label = seatLabelOutwardPct(seatIndex, rimW, rimH)
        const { given, suffix } = splitSeatingDisplayName(seat.name)

        return (
          <div key={seat.seatNum}>
            <div
              className="absolute z-[2] flex h-9 w-9 items-center justify-center rounded-full border-2 border-emerald-300/75 bg-neutral-950/90 font-mono text-sm font-black tabular-nums text-amber-50 shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:h-10 sm:w-10 sm:text-base"
              style={{
                left: `${dot.leftPct}%`,
                top: `${dot.topPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
              aria-label={`Seat ${seat.seatNum}, ${seat.name}`}
            >
              {seat.seatNum}
            </div>
            <div
              className="absolute z-[3] max-w-[min(14rem,38vw)] text-pretty leading-snug sm:max-w-[15rem]"
              style={{
                left: `${label.leftPct}%`,
                top: `${label.topPct}%`,
                transform: label.anchor,
                textAlign: label.anchor.includes('-50%') ? 'center' : label.anchor.startsWith('translate(-100%') ? 'right' : 'left',
              }}
            >
              <span className="text-base font-semibold text-white sm:text-lg">
                {given}
                {suffix ? <span className="font-normal text-amber-100/50"> {suffix}</span> : null}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
