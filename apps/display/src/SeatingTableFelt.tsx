import { useLayoutEffect, useRef, useState } from 'react'
import { mosaicSeatDotPct } from './venueMosaicSeatGeometry'
import { capsuleBorderRadiusCss } from './tableRimGeometry'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

const FELT_INSET = { top: 0.1, right: 0.06, bottom: 0.13, left: 0.06 }
const FELT_ASPECT = 8 / 5

function splitSeatingDisplayName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

function SeatingMiniFelt({
  widthPx,
  heightPx,
}: {
  widthPx: number
  heightPx: number
}) {
  const railRadius =
    widthPx > 0 && heightPx > 0 ? capsuleBorderRadiusCss(widthPx, heightPx) : '50% / 50%'
  const feltRadius =
    widthPx > 0 && heightPx > 0
      ? capsuleBorderRadiusCss(
          widthPx * (1 - FELT_INSET.left - FELT_INSET.right),
          heightPx * (1 - FELT_INSET.top - FELT_INSET.bottom)
        )
      : '50% / 50%'

  return (
    <>
      <div
        className="absolute inset-0 border border-amber-700/85 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 shadow-md"
        style={{ borderRadius: railRadius }}
      />
      <div
        className="absolute border border-amber-700/60 shadow-inner"
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
    </>
  )
}

/** Reference diagram — all eight seat numbers at physical positions around a small felt. */
export function SeatingTableDiagram({ occupiedSeatNums }: { occupiedSeatNums: number[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapPx, setWrapPx] = useState({ w: 0, h: 0 })
  const occupied = new Set(occupiedSeatNums)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 }
      setWrapPx({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w: wrapW, h: wrapH } = wrapPx
  const feltW = Math.min(wrapW * 0.88, wrapH * FELT_ASPECT * 0.88)
  const feltH = feltW / FELT_ASPECT
  const feltLeft = (wrapW - feltW) / 2
  const feltTop = (wrapH - feltH) / 2

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto aspect-[8/5] h-full max-h-full w-auto max-w-full"
      role="img"
      aria-label="Seat positions around the table"
    >
      {wrapW > 0 && wrapH > 0 ? (
        <div
          className="absolute"
          style={{ left: feltLeft, top: feltTop, width: feltW, height: feltH }}
        >
          <SeatingMiniFelt widthPx={feltW} heightPx={feltH} />
        </div>
      ) : null}

      {wrapW > 0 &&
        wrapH > 0 &&
        Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, seatIndex) => {
          const seatNum = seatIndex + 1
          const rim = mosaicSeatDotPct(seatIndex, VENUE_WALL_SEAT_SLOTS, feltW, feltH)
          const left = feltLeft + (rim.leftPct / 100) * feltW
          const top = feltTop + (rim.topPct / 100) * feltH
          const filled = occupied.has(seatNum)

          return (
            <div
              key={seatNum}
              className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border font-mono text-[11px] font-black tabular-nums sm:h-8 sm:w-8 sm:text-xs ${
                filled
                  ? 'border-emerald-300/80 bg-neutral-950/95 text-amber-50 shadow-sm ring-1 ring-emerald-400/25'
                  : 'border-white/20 bg-slate-950/70 text-white/35'
              }`}
              style={{ left, top }}
              aria-hidden
            >
              {seatNum}
            </div>
          )
        })}
    </div>
  )
}

export type SeatingTableSeat = {
  seatNum: number
  name: string
}

/** Numbered player roster — full names, sorted by seat. */
export function SeatingPlayerList({ seats }: { seats: SeatingTableSeat[] }) {
  const sorted = [...seats].sort((a, b) => a.seatNum - b.seatNum)

  return (
    <ul className="grid h-full min-h-0 grid-cols-2 content-center gap-x-2.5 gap-y-1 sm:gap-x-3 sm:gap-y-1.5">
      {sorted.map((seat) => {
        const { given, suffix } = splitSeatingDisplayName(seat.name)
        return (
          <li
            key={seat.seatNum}
            className="flex min-h-0 items-center gap-2 rounded-lg bg-white/[0.045] px-2 py-1 ring-1 ring-white/[0.06] sm:gap-2.5 sm:px-2.5 sm:py-1.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-300/70 bg-neutral-950/95 font-mono text-[11px] font-black tabular-nums text-amber-50 sm:h-7 sm:w-7 sm:text-xs">
              {seat.seatNum}
            </span>
            <span className="min-w-0 text-sm font-semibold leading-snug text-white sm:text-base">
              {given}
              {suffix ? <span className="font-normal text-amber-100/50"> {suffix}</span> : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
