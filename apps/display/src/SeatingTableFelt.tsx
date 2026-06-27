import { useLayoutEffect, useRef, useState } from 'react'
import { PokerTableGraphic, SeatCupholderMarker, stadiumCupholderSizePx } from '@qhe/ui'
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
          className="absolute drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]"
          style={{ left: feltLeft, top: feltTop, width: feltW, height: feltH }}
        >
          <PokerTableGraphic className="h-full w-full" />
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
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
              aria-hidden
            >
              <SeatCupholderMarker
                sizePx={stadiumCupholderSizePx(feltW)}
                label={seatNum}
                labelClassName="font-mono text-[9px] tabular-nums sm:text-[10px]"
                state={filled ? 'default' : 'empty'}
              />
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

/** Numbered player roster — full grid with open seats; sorted by seat. */
export function SeatingPlayerList({ seats }: { seats: SeatingTableSeat[] }) {
  const bySeat = new Map(seats.map((seat) => [seat.seatNum, seat]))
  const slots = Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, index) => {
    const seatNum = index + 1
    return bySeat.get(seatNum) ?? { seatNum, name: '' }
  })
  const rowCount = Math.max(1, Math.ceil(slots.length / 2))

  return (
    <ul
      className="seating-table-roster-grid grid h-full min-h-0 grid-cols-2 gap-x-1.5 gap-y-1 sm:gap-x-2 sm:gap-y-1.5"
      style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
    >
      {slots.map((seat) => {
        const occupied = seat.name.trim().length > 0
        const { given, suffix } = splitSeatingDisplayName(seat.name)

        return (
          <li
            key={seat.seatNum}
            className={
              occupied
                ? 'seating-table-player-well seating-table-player-well--filled'
                : 'seating-table-player-well seating-table-player-well--open'
            }
          >
            <SeatCupholderMarker
              sizeClassName="h-6 w-6 shrink-0 sm:h-7 sm:w-7"
              label={seat.seatNum}
              labelClassName="font-mono text-[9px] tabular-nums sm:text-[10px]"
              state={occupied ? 'default' : 'empty'}
            />
            {occupied ? (
              <span className="seating-table-player-name min-w-0 truncate">
                {given}
                {suffix ? <span className="seating-table-player-suffix"> {suffix}</span> : null}
              </span>
            ) : (
              <span className="seating-table-player-open" aria-label={`Seat ${seat.seatNum} open`}>
                Open
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
