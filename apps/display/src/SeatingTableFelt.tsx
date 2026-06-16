import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { mosaicSeatDotPct } from './venueMosaicSeatGeometry'
import { capsuleBorderRadiusCss } from './tableRimGeometry'
import { VENUE_WALL_SEAT_SLOTS } from './venueWallModel'

const FELT_INSET = { top: 0.1, right: 0.06, bottom: 0.13, left: 0.06 }
const FELT_WIDTH_FRAC = 0.36
const FELT_ASPECT = 8 / 5

type SeatPlacement = 'top' | 'bottom' | 'left' | 'right'

type SeatLayout = {
  xPct: number
  yPct: number
  placement: SeatPlacement
}

function seatingChartSeatLayout(
  seatIndex: number,
  wrapperW: number,
  wrapperH: number
): SeatLayout {
  const feltW = wrapperW * FELT_WIDTH_FRAC
  const feltH = feltW / FELT_ASPECT
  const feltLeft = (wrapperW - feltW) / 2
  const feltTop = (wrapperH - feltH) / 2
  const cx = feltLeft + feltW / 2
  const cy = feltTop + feltH / 2

  const rim = mosaicSeatDotPct(seatIndex, VENUE_WALL_SEAT_SLOTS, feltW, feltH)
  const dotX = feltLeft + (rim.leftPct / 100) * feltW
  const dotY = feltTop + (rim.topPct / 100) * feltH

  let dx = dotX - cx
  let dy = dotY - cy
  const len = Math.hypot(dx, dy) || 1
  dx /= len
  dy /= len

  const nameOffset = Math.min(wrapperW, wrapperH) * 0.1 + 10
  const nameX = dotX + dx * nameOffset
  const nameY = dotY + dy * nameOffset

  const placement: SeatPlacement =
    Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'top' : 'bottom') : dx < 0 ? 'left' : 'right'

  return {
    xPct: wrapperW > 0 ? (nameX / wrapperW) * 100 : 50,
    yPct: wrapperH > 0 ? (nameY / wrapperH) * 100 : 50,
    placement,
  }
}

function splitSeatingDisplayName(name: string): { given: string; suffix: string } {
  const trimmed = name.trim()
  const match = trimmed.match(/^(.+?)\s+([A-Za-z]\.?)$/)
  if (match) return { given: match[1]!, suffix: match[2]! }
  return { given: trimmed, suffix: '' }
}

function seatClusterClass(placement: SeatPlacement): string {
  switch (placement) {
    case 'top':
      return 'flex-col-reverse items-center text-center'
    case 'bottom':
      return 'flex-col items-center text-center'
    case 'left':
      return 'flex-row-reverse items-center text-right'
    case 'right':
      return 'flex-row items-center text-left'
  }
}

function seatClusterTransform(placement: SeatPlacement): string {
  switch (placement) {
    case 'top':
      return 'translate(-50%, -100%)'
    case 'bottom':
      return 'translate(-50%, 0%)'
    case 'left':
      return 'translate(-100%, -50%)'
    case 'right':
      return 'translate(0%, -50%)'
  }
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
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: widthPx, height: heightPx }}
      aria-hidden
    >
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
    </div>
  )
}

function SeatBadge({ seatNum }: { seatNum: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-300/70 bg-neutral-950/95 font-mono text-xs font-black tabular-nums text-amber-50 shadow-sm ring-1 ring-emerald-400/20 sm:h-8 sm:w-8 sm:text-sm">
      {seatNum}
    </span>
  )
}

function SeatName({ name }: { name: string }) {
  const { given, suffix } = splitSeatingDisplayName(name)
  return (
    <span className="max-w-[9.5rem] text-pretty text-sm font-semibold leading-snug text-white sm:max-w-[10.5rem] sm:text-base">
      {given}
      {suffix ? <span className="font-normal text-amber-100/50"> {suffix}</span> : null}
    </span>
  )
}

export type SeatingTableFeltSeat = {
  seatNum: number
  name: string
}

export default function SeatingTableFelt({ seats }: { seats: SeatingTableFeltSeat[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapPx, setWrapPx] = useState({ w: 0, h: 0 })

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
  const feltW = wrapW * FELT_WIDTH_FRAC
  const feltH = feltW / FELT_ASPECT

  const wrapStyle: CSSProperties = {
    aspectRatio: '5 / 3.6',
    minHeight: '10.5rem',
  }

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full max-w-full overflow-hidden"
      style={wrapStyle}
      role="img"
      aria-label={`Table with ${seats.length} seated players`}
    >
      {wrapW > 0 && wrapH > 0 ? (
        <SeatingMiniFelt widthPx={feltW} heightPx={feltH} />
      ) : null}

      {wrapW > 0 &&
        wrapH > 0 &&
        seats.map((seat) => {
          const seatIndex = seat.seatNum - 1
          if (seatIndex < 0 || seatIndex >= VENUE_WALL_SEAT_SLOTS) return null
          const layout = seatingChartSeatLayout(seatIndex, wrapW, wrapH)

          return (
            <div
              key={seat.seatNum}
              className={`absolute flex gap-1.5 sm:gap-2 ${seatClusterClass(layout.placement)}`}
              style={{
                left: `${layout.xPct}%`,
                top: `${layout.yPct}%`,
                transform: seatClusterTransform(layout.placement),
              }}
              aria-label={`Seat ${seat.seatNum}, ${seat.name}`}
            >
              <SeatBadge seatNum={seat.seatNum} />
              <SeatName name={seat.name} />
            </div>
          )
        })}
    </div>
  )
}
