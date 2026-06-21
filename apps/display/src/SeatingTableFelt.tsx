import { useLayoutEffect, useRef, useState } from 'react'
import { CupholderGraphic, PokerTableGraphic } from '@qhe/ui'
import { mosaicSeatDotPct } from './venueMosaicSeatGeometry'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

const FELT_ASPECT = 8 / 5

function splitSeatingDisplayName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
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
      className="relative mx-auto h-full max-h-full w-full max-w-full"
      role="img"
      aria-label="Seat positions around the table"
    >
      {wrapW > 0 && wrapH > 0 ? (
        <div
          className="absolute"
          style={{ left: feltLeft, top: feltTop, width: feltW, height: feltH }}
        >
          <PokerTableGraphic className="h-full w-full drop-shadow-md" />
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
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 sm:h-6 sm:w-6"
              style={{ left, top }}
              aria-hidden
            >
              <CupholderGraphic dimmed={!filled} className="h-full w-full" />
              <span
                className={`absolute inset-0 flex items-center justify-center font-mono text-[9px] font-black tabular-nums sm:text-[10px] ${
                  filled ? 'text-amber-50' : 'text-white/35'
                }`}
              >
                {seatNum}
              </span>
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

/** Numbered player roster — full names, sorted by seat; rows stretch to fill card height. */
export function SeatingPlayerList({ seats }: { seats: SeatingTableSeat[] }) {
  const sorted = [...seats].sort((a, b) => a.seatNum - b.seatNum)
  const rowCount = Math.max(1, Math.ceil(sorted.length / 2))

  return (
    <ul
      className="grid h-full min-h-0 grid-cols-2 gap-x-2 gap-y-1.5 sm:gap-x-2.5 sm:gap-y-2"
      style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
    >
      {sorted.map((seat) => {
        const { given, suffix } = splitSeatingDisplayName(seat.name)
        return (
          <li
            key={seat.seatNum}
            className="flex min-h-0 min-w-0 items-center gap-2 rounded-md bg-white/[0.045] px-2 py-1.5 ring-1 ring-white/[0.06] sm:gap-2.5 sm:px-2.5 sm:py-2"
          >
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
              <CupholderGraphic className="absolute inset-0" />
              <span className="relative font-mono text-[9px] font-black tabular-nums text-amber-50 sm:text-[10px]">
                {seat.seatNum}
              </span>
            </span>
            <span className="min-w-0 truncate text-xs font-semibold leading-tight text-white sm:text-sm">
              {given}
              {suffix ? <span className="font-normal text-amber-100/50"> {suffix}</span> : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
