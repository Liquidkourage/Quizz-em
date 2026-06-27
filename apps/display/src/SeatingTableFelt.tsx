import { useLayoutEffect, useRef, useState } from 'react'
import { PokerTableGraphic } from '@qhe/ui'
import { SeatingSeatBadge } from './SeatingSeatBadge'
import { mosaicSeatDotPct } from './venueMosaicSeatGeometry'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

const FELT_ASPECT = 8 / 5

/** Map marker diameter from felt width — keeps badges on the rail, not full-card size. */
function seatingMapBadgePx(feltW: number): number {
  return Math.max(20, Math.min(36, Math.round(feltW * 0.095)))
}

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
  highlightSeatNum = null,
}: {
  occupiedSeatNums: number[]
  variant?: 'default' | 'premium'
  highlightSeatNum?: number | null
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
  const feltScale = premium ? 1.06 : 0.88
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

          const markerPx = seatingMapBadgePx(feltW)

          return (
            <div
              key={seatNum}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left, top, width: markerPx, height: markerPx }}
              aria-hidden
            >
              <SeatingSeatBadge
                seatNum={seatNum}
                size="map"
                fill
                empty={!filled}
                highlight={highlightSeatNum != null && seatNum === highlightSeatNum}
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
  highlight = false,
}: {
  seatNum: number
  name: string | null
  variant: 'default' | 'premium'
  highlight?: boolean
}) {
  const premium = variant === 'premium'
  const occupied = name != null && name.trim().length > 0
  const { given, suffix } = occupied ? splitSeatingDisplayName(name) : { given: '', suffix: '' }

  if (!premium) {
    return (
      <li className="flex min-h-0 min-w-0 items-center gap-2 rounded-md bg-white/[0.045] px-2 py-1.5 ring-1 ring-white/[0.06] sm:gap-2.5 sm:px-2.5 sm:py-2">
        <div className="seating-roster-badge-anchor">
          <SeatingSeatBadge seatNum={seatNum} size="roster" fill empty={!occupied} />
        </div>
        {occupied ? (
          <span className="min-w-0 truncate text-xs font-semibold leading-tight text-white sm:text-sm">
            {given}
            {suffix ? <span className="font-normal text-amber-100/55"> {suffix}</span> : null}
          </span>
        ) : null}
      </li>
    )
  }

  return (
    <li
      className={[
        'seating-roster-row flex min-h-0 min-w-0 items-center',
        occupied ? '' : 'seating-roster-row--empty',
        highlight ? 'seating-roster-row--highlight' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="seating-roster-badge-anchor">
        <SeatingSeatBadge
          seatNum={seatNum}
          size="roster"
          fill
          empty={!occupied}
          highlight={highlight}
        />
      </div>
      {occupied ? (
        <span className="seating-roster-name min-w-0 flex-1 truncate">
          {given}
          {suffix ? <span className="seating-roster-suffix"> {suffix}</span> : null}
          {highlight ? <span className="seating-roster-you">You</span> : null}
        </span>
      ) : (
        <span className="seating-roster-open min-w-0 flex-1 truncate">Open seat</span>
      )}
    </li>
  )
}

/** Numbered player roster — sorted by seat; optional fixed 8-slot grid with empty rows. */
export function SeatingPlayerList({
  seats,
  showAllSlots = false,
  variant = 'default',
  highlightSeatNum = null,
}: {
  seats: SeatingTableSeat[]
  showAllSlots?: boolean
  variant?: 'default' | 'premium'
  /** Optional local-player seat highlight when caller can identify it. */
  highlightSeatNum?: number | null
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
              highlight={highlightSeatNum != null && leftSeat === highlightSeatNum}
            />,
            <SeatingRosterRow
              key={rightSeat}
              seatNum={rightSeat}
              name={seatByNum.get(rightSeat) ?? null}
              variant={variant}
              highlight={highlightSeatNum != null && rightSeat === highlightSeatNum}
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
        <SeatingRosterRow
          key={seat.seatNum}
          seatNum={seat.seatNum}
          name={seat.name}
          variant={variant}
          highlight={highlightSeatNum != null && seat.seatNum === highlightSeatNum}
        />
      ))}
    </ul>
  )
}
