import { useLayoutEffect, useRef, useState } from 'react'
import { PokerTableGraphic, SeatCupholderMarker, stadiumCupholderSizePx } from '@qhe/ui'
import { mosaicSeatDotPct } from './venueMosaicSeatGeometry'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

const FELT_ASPECT = 8 / 5

const SEATING_ROSTER_LEFT = [1, 3, 5, 7] as const
const SEATING_ROSTER_RIGHT = [2, 4, 6, 8] as const

function splitSeatingDisplayName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

/** Reference diagram — eight seat numbers at physical positions around the felt. */
export function SeatingTableDiagram({
  occupiedSeatNums,
  variant = 'default',
}: {
  occupiedSeatNums: number[]
  variant?: 'default' | 'premium'
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapPx, setWrapPx] = useState({ w: 0, h: 0 })
  const occupied = new Set(occupiedSeatNums)
  const premium = variant === 'premium'

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
  const feltScale = premium ? 0.94 : 0.88
  const feltW = Math.min(wrapW * feltScale, wrapH * FELT_ASPECT * feltScale)
  const feltH = feltW / FELT_ASPECT
  const feltLeft = (wrapW - feltW) / 2
  const feltTop = (wrapH - feltH) / 2

  return (
    <div
      ref={wrapRef}
      className={`relative mx-auto h-full max-h-full w-full max-w-full ${premium ? 'seating-table-diagram' : ''}`}
      role="img"
      aria-label="Seat positions around the table"
    >
      {wrapW > 0 && wrapH > 0 ? (
        <div
          className="absolute"
          style={{ left: feltLeft, top: feltTop, width: feltW, height: feltH }}
        >
          <PokerTableGraphic
            className={`h-full w-full ${premium ? 'drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]' : 'drop-shadow-md'}`}
          />
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
          const markerSize = stadiumCupholderSizePx(feltW) * (premium ? 1.12 : 1)

          return (
            <div
              key={seatNum}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
              aria-hidden
            >
              <SeatCupholderMarker
                sizePx={markerSize}
                label={seatNum}
                labelClassName={
                  premium
                    ? 'font-mono text-[10px] tabular-nums sm:text-[11px]'
                    : 'font-mono text-[9px] tabular-nums sm:text-[10px]'
                }
                state={filled ? 'default' : 'empty'}
                className={premium ? 'seating-seat-marker-map' : undefined}
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

function SeatingRosterRow({
  seatNum,
  name,
  variant,
}: {
  seatNum: number
  name: string | null
  variant: 'default' | 'premium'
}) {
  const premium = variant === 'premium'
  const occupied = name != null && name.trim().length > 0
  const { given, suffix } = occupied ? splitSeatingDisplayName(name) : { given: '', suffix: '' }

  return (
    <li
      className={
        premium
          ? `seating-roster-row flex min-h-0 min-w-0 items-center gap-2 sm:gap-2.5 ${occupied ? '' : 'seating-roster-row--empty'}`
          : 'flex min-h-0 min-w-0 items-center gap-2 rounded-md bg-white/[0.045] px-2 py-1.5 ring-1 ring-white/[0.06] sm:gap-2.5 sm:px-2.5 sm:py-2'
      }
    >
      <SeatCupholderMarker
        sizeClassName={premium ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-6 w-6 sm:h-7 sm:w-7'}
        label={seatNum}
        labelClassName="font-mono text-[9px] tabular-nums sm:text-[10px]"
        state={occupied ? 'default' : 'empty'}
        className={premium ? 'seating-seat-marker-roster shrink-0' : undefined}
      />
      {occupied ? (
        <span
          className={
            premium
              ? 'seating-roster-name min-w-0 truncate font-semibold leading-tight text-white'
              : 'min-w-0 truncate text-xs font-semibold leading-tight text-white sm:text-sm'
          }
        >
          {given}
          {suffix ? <span className="font-normal text-amber-100/55"> {suffix}</span> : null}
        </span>
      ) : premium ? (
        <span className="seating-roster-open min-w-0 truncate text-sm font-medium text-emerald-200/45 sm:text-base">
          Open seat
        </span>
      ) : null}
    </li>
  )
}

/** Numbered player roster — sorted by seat; optional fixed 8-slot grid with empty rows. */
export function SeatingPlayerList({
  seats,
  showAllSlots = false,
  variant = 'default',
}: {
  seats: SeatingTableSeat[]
  showAllSlots?: boolean
  variant?: 'default' | 'premium'
}) {
  const seatByNum = new Map(seats.map((s) => [s.seatNum, s.name]))
  const premium = variant === 'premium'

  if (showAllSlots && premium) {
    return (
      <ul className="seating-roster-grid grid h-full min-h-0 grid-cols-2">
        {SEATING_ROSTER_LEFT.flatMap((leftSeat, rowIndex) => {
          const rightSeat = SEATING_ROSTER_RIGHT[rowIndex]!
          return [
            <SeatingRosterRow
              key={leftSeat}
              seatNum={leftSeat}
              name={seatByNum.get(leftSeat) ?? null}
              variant={variant}
            />,
            <SeatingRosterRow
              key={rightSeat}
              seatNum={rightSeat}
              name={seatByNum.get(rightSeat) ?? null}
              variant={variant}
            />,
          ]
        })}
      </ul>
    )
  }

  const sorted = [...seats].sort((a, b) => a.seatNum - b.seatNum)
  const rowCount = Math.max(1, Math.ceil(sorted.length / 2))

  return (
    <ul
      className={
        premium
          ? 'seating-roster-grid grid h-full min-h-0 grid-cols-2'
          : 'grid h-full min-h-0 grid-cols-2 gap-x-2 gap-y-1.5 sm:gap-x-2.5 sm:gap-y-2'
      }
      style={premium ? undefined : { gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
    >
      {sorted.map((seat) => (
        <SeatingRosterRow key={seat.seatNum} seatNum={seat.seatNum} name={seat.name} variant={variant} />
      ))}
    </ul>
  )
}
