import { useEffect, useRef, useState } from 'react'
import {
  MOSAIC_SEAT_COUNT,
  mosaicSeatDotPct,
  mosaicSeatHoleInwardFrac,
  mosaicSeatHoleLayout,
} from '@qhe/ui'
import {
  mosaicHoleClearOfInitialsFrac,
  mosaicSeatInitialFontPx,
  mosaicSeatStackFontPx,
  mosaicSeatStackPlacement,
  publicFeltDrawsSeat,
  publicSeatShowsHoleCards,
} from './mosaicSeatStacks'
import { broadcastFeltAssetAnchors } from './venueMosaicSeatGeometry'
import { DUAL_BROADCAST_HOLE_INWARD_FRAC } from './venueBroadcastLayout'
import { formatVenueBankroll } from './venueLeaderboard'

export const BET_PUSH_HOLD_MS = 2_000

export type Point = { x: number; y: number }
export type Box = { left: number; top: number; width: number; height: number }
export type BetPush = { seat: number; amount: number; untilMs: number }

/** Chips that just left the stack. The first time we see a seat, there is no "just". */
export function chipsAdded(before: number | null, after: number | null): number | null {
  if (before == null || after == null) return null
  const delta = after - before
  return delta > 0 ? delta : null
}

export function betPushPoint(seat: Point, pot: Point): Point {
  return { x: (seat.x + pot.x) / 2, y: (seat.y + pot.y) / 2 }
}

/** A disc big enough to read across the room, and still able to sit on open felt. */
export function betPushChipPx(ringShort: number): number {
  if (!(ringShort > 0)) return 48
  return Math.round(Math.min(88, Math.max(48, ringShort * 0.09)))
}

export function betPushFontPx(amount: number, chipPx: number): number {
  const text = formatVenueBankroll(amount)
  const fitted = Math.floor((chipPx * 0.86) / Math.max(1, text.length * 0.68))
  return Math.max(10, Math.min(40, fitted))
}

export function boxAround(center: Point, width: number, height: number): Box {
  return { left: center.x - width / 2, top: center.y - height / 2, width, height }
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  )
}

function inside(inner: Box, outer: Box): boolean {
  return (
    inner.left >= outer.left - 0.5 &&
    inner.top >= outer.top - 0.5 &&
    inner.left + inner.width <= outer.left + outer.width + 0.5 &&
    inner.top + inner.height <= outer.top + outer.height + 0.5
  )
}

/** The amount fits when its box stays on the green and clear of everything else drawn there. */
export function betPushFits(label: Box, felt: Box, obstacles: readonly Box[]): boolean {
  if (!(label.width > 0) || !(label.height > 0)) return false
  if (!inside(label, felt)) return false
  return obstacles.every((box) => box.width <= 0 || box.height <= 0 || !overlaps(label, box))
}

function wholeChip(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.floor(value))
}

function normalizeInvested(
  values: readonly (number | null | undefined)[],
  length: number,
): (number | null)[] {
  return Array.from({ length }, (_, index) => wholeChip(values[index]))
}

/** Carry the last invested amount and any cue that has not finished its two seconds. */
export function advanceBetPushes(
  baseline: readonly (number | null)[] | null,
  invested: readonly (number | null | undefined)[],
  nowMs: number,
  holdMs: number,
  existing: readonly BetPush[],
): { baseline: (number | null)[]; pushes: BetPush[] } {
  const length = Math.max(baseline?.length ?? 0, invested.length)
  const next = normalizeInvested(invested, length)
  const live = existing.filter((push) => push.untilMs > nowMs)
  if (baseline == null) return { baseline: next, pushes: live }
  const born = new Map<number, BetPush>()
  for (let seat = 0; seat < length; seat += 1) {
    const added = chipsAdded(baseline[seat] ?? null, next[seat] ?? null)
    if (added == null) continue
    born.set(seat, { seat, amount: added, untilMs: nowMs + holdMs })
  }
  const kept = live.filter((push) => !born.has(push.seat))
  return { baseline: next, pushes: [...kept, ...born.values()] }
}

const BET_PUSH_MIN_PX = 16

function largestChipPx(
  point: Point,
  felt: Box,
  obstacles: readonly Box[],
  preferred: number,
): number {
  let lo = 0
  let hi = preferred
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (betPushFits(boxAround(point, mid, mid), felt, obstacles)) lo = mid
    else hi = mid - 1
  }
  return lo
}

function landingBeats(
  next: { size: number; along: number; offset: number },
  best: { size: number; along: number; offset: number },
): boolean {
  if (next.size !== best.size) return next.size > best.size
  const along = Math.abs(next.along - 0.5) - Math.abs(best.along - 0.5)
  if (along !== 0) return along < 0
  return Math.abs(next.offset) < Math.abs(best.offset)
}

/** Largest chip that still sits on open felt between the player and the pot. */
function betPushLanding(
  seat: Point,
  pot: Point,
  felt: Box,
  obstacles: readonly Box[],
  preferred: number,
): { point: Point; size: number } | null {
  const dx = pot.x - seat.x
  const dy = pot.y - seat.y
  const len = Math.hypot(dx, dy)
  if (!(len > 0) || !(preferred >= BET_PUSH_MIN_PX)) return null
  const sideX = -dy / len
  const sideY = dx / len
  let best: { point: Point; size: number; along: number; offset: number } | null = null
  for (let step = 0; step <= 12; step += 1) {
    const along = 0.26 + step * 0.04
    for (let side = -9; side <= 9; side += 1) {
      const offset = side * 0.04
      const point = {
        x: seat.x + dx * along + sideX * len * offset,
        y: seat.y + dy * along + sideY * len * offset,
      }
      const size = largestChipPx(point, felt, obstacles, preferred)
      if (size < BET_PUSH_MIN_PX) continue
      const next = { point, size, along, offset }
      if (best == null || landingBeats(next, best)) best = next
    }
  }
  return best == null ? null : { point: best.point, size: best.size }
}

/** Green inside the rail. A label that leaves this box is on the wood or a name. */
export function ringGreenBox(ringW: number, ringH: number): Box {
  const insetX = ringW * 0.08
  const insetY = ringH * 0.11
  return {
    left: insetX,
    top: insetY,
    width: Math.max(0, ringW - insetX * 2),
    height: Math.max(0, ringH - insetY * 2),
  }
}

export function FeltBetPushMarks({
  marks,
}: {
  marks: readonly {
    key: string
    amount: number
    fromLeftPct: number
    fromTopPct: number
    leftPct: number
    topPct: number
    sizePx: number
  }[]
}) {
  if (marks.length === 0) return null
  return (
    <>
      {marks.map((mark) => (
        <span
          key={mark.key}
          className="felt-bet-chip pointer-events-none absolute tabular-nums"
          style={{
            left: `${mark.leftPct}%`,
            top: `${mark.topPct}%`,
            width: mark.sizePx,
            height: mark.sizePx,
            fontFamily: 'Bungee, system-ui, sans-serif',
            fontSize: betPushFontPx(mark.amount, mark.sizePx),
            ['--felt-bet-from-left' as string]: `${mark.fromLeftPct}%`,
            ['--felt-bet-from-top' as string]: `${mark.fromTopPct}%`,
          }}
        >
          {formatVenueBankroll(mark.amount)}
        </span>
      ))}
    </>
  )
}

export function useFeltBetPushes(invested: readonly number[] | undefined): BetPush[] {
  const baselineRef = useRef<(number | null)[] | null>(null)
  const pushesRef = useRef<BetPush[]>([])
  const [pushes, setPushes] = useState<BetPush[]>([])
  const investedKey = invested?.join(',') ?? ''

  useEffect(() => {
    if (invested == null) return
    const step = advanceBetPushes(
      baselineRef.current,
      invested,
      Date.now(),
      BET_PUSH_HOLD_MS,
      pushesRef.current,
    )
    baselineRef.current = step.baseline
    pushesRef.current = step.pushes
    setPushes(step.pushes)
  }, [invested, investedKey])

  useEffect(() => {
    if (pushes.length === 0) return
    const soonest = Math.min(...pushes.map((push) => push.untilMs))
    const timer = window.setTimeout(() => {
      const live = pushesRef.current.filter((push) => push.untilMs > Date.now())
      pushesRef.current = live
      setPushes(live)
    }, Math.max(0, soonest - Date.now()))
    return () => window.clearTimeout(timer)
  }, [pushes])

  return pushes
}

export function placeBetPushes(args: {
  ringW: number
  ringH: number
  center: Point
  seats: readonly (Point | null)[]
  pushes: readonly BetPush[]
  obstacles: readonly Box[]
}): {
  key: string
  amount: number
  fromLeftPct: number
  fromTopPct: number
  leftPct: number
  topPct: number
  sizePx: number
}[] {
  if (!(args.ringW > 0) || !(args.ringH > 0)) return []
  const felt = ringGreenBox(args.ringW, args.ringH)
  const ringShort = Math.min(args.ringW, args.ringH)
  const marks: {
    key: string
    amount: number
    fromLeftPct: number
    fromTopPct: number
    leftPct: number
    topPct: number
    sizePx: number
  }[] = []
  for (const push of args.pushes) {
    const seat = args.seats[push.seat]
    if (seat == null) continue
    const landing = betPushLanding(
      seat,
      args.center,
      felt,
      args.obstacles,
      betPushChipPx(ringShort),
    )
    if (landing == null) continue
    marks.push({
      key: `${push.seat}:${push.untilMs}`,
      amount: push.amount,
      fromLeftPct: (seat.x / args.ringW) * 100,
      fromTopPct: (seat.y / args.ringH) * 100,
      leftPct: (landing.point.x / args.ringW) * 100,
      topPct: (landing.point.y / args.ringH) * 100,
      sizePx: landing.size,
    })
  }
  return marks
}

function pctPoint(leftPct: number, topPct: number, ringW: number, ringH: number): Point {
  return { x: (leftPct / 100) * ringW, y: (topPct / 100) * ringH }
}

function textBox(center: Point, label: string, fontPx: number): Box | null {
  if (!(fontPx > 0) || label.trim() === '') return null
  return boxAround(center, Math.ceil(label.length * fontPx * 0.62), fontPx * 1.15)
}

function holeBox(point: Point, width: number, height: number, anchor: 'center' | 'bottom'): Box {
  if (anchor === 'center') return boxAround(point, width, height)
  return { left: point.x - width / 2, top: point.y - height, width, height }
}

export function FeltBetPushLayer({
  ringW,
  ringH,
  invested,
  seatNames,
  seatFolded,
  seatPointsOnly,
  holesDealt,
  holeDigits,
  holeCardW,
  holeCardH,
  holeCardScale,
  showStacks,
  centerLeftPct,
  centerTopPct,
  potLabel,
  potFontPx,
  potShiftY,
  boardWidth,
  boardHeight,
  boardShiftY,
  mode,
}: {
  ringW: number
  ringH: number
  invested: readonly number[] | undefined
  seatNames: readonly string[]
  seatFolded: readonly boolean[]
  seatPointsOnly: readonly boolean[]
  holesDealt: readonly boolean[]
  holeDigits: readonly (readonly [number, number] | null)[]
  holeCardW: number
  holeCardH: number
  holeCardScale: number
  showStacks: boolean
  centerLeftPct: number
  centerTopPct: number
  potLabel: string
  potFontPx: number
  potShiftY: number
  boardWidth: number
  boardHeight: number
  boardShiftY: number
  mode: 'mosaic' | 'broadcast' | 'dual'
}) {
  const pushes = useFeltBetPushes(invested)
  if (pushes.length === 0 || !(ringW > 0) || !(ringH > 0)) return null
  const center = pctPoint(centerLeftPct, centerTopPct, ringW, ringH)
  const stackFont = showStacks ? mosaicSeatStackFontPx(ringW, seatNames.filter((name) => name.trim()).length, ringH) : 0
  const nameFont = mode === 'mosaic' ? mosaicSeatInitialFontPx(ringW, ringH) : Math.max(18, Math.round(ringH * 0.045))
  const seats: (Point | null)[] = []
  const obstacles: Box[] = []
  const pot = textBox({ x: center.x, y: center.y + potShiftY }, potLabel, potFontPx)
  if (pot) obstacles.push(pot)
  if (boardWidth > 0 && boardHeight > 0) {
    obstacles.push(boxAround({ x: center.x, y: center.y + boardShiftY }, boardWidth, boardHeight))
  }
  for (let seat = 0; seat < MOSAIC_SEAT_COUNT; seat += 1) {
    const name = seatNames[seat]?.trim() ?? ''
    const drawn = name !== '' && publicFeltDrawsSeat(seatPointsOnly[seat] === true)
    if (!drawn) {
      seats.push(null)
      continue
    }
    const cup = mosaicSeatDotPct(seat, MOSAIC_SEAT_COUNT, ringW, ringH)
    const seatPoint = pctPoint(cup.leftPct, cup.topPct, ringW, ringH)
    seats.push(seatPoint)
    obstacles.push(boxAround(seatPoint, nameFont * 2.6, nameFont * 1.25))
    if (showStacks && mode === 'mosaic') {
      const stack = mosaicSeatStackPlacement(seat, ringW, ringH)
      const stackPoint = pctPoint(stack.leftPct, stack.topPct, ringW, ringH)
      const width = stackFont * 4.2
      const height = stackFont * 1.25
      const growUp = stack.transform.includes('-100%')
      obstacles.push({
        left: stackPoint.x - width / 2,
        top: growUp ? stackPoint.y - height : stackPoint.y,
        width,
        height,
      })
    }
    if (showStacks && mode !== 'mosaic') {
      const chip = broadcastFeltAssetAnchors(seat, ringW, ringH, 28, mode === 'dual' ? 'dual' : 'solo').chip
      obstacles.push(boxAround(pctPoint(chip.leftPct, chip.topPct, ringW, ringH), 56, 36))
    }
    const holes = publicSeatShowsHoleCards(
      true,
      seatFolded[seat] === true,
      seatPointsOnly[seat] === true,
      holesDealt[seat] === true || holeDigits[seat] != null,
    )
    if (!holes) continue
    const inward =
      mode === 'mosaic'
        ? mosaicHoleClearOfInitialsFrac(seat, ringW, ringH)
        : mode === 'dual'
          ? DUAL_BROADCAST_HOLE_INWARD_FRAC
          : mosaicSeatHoleInwardFrac(seat)
    const hole =
      mode === 'broadcast'
        ? broadcastFeltAssetAnchors(seat, ringW, ringH, 28, 'solo').hole
        : mosaicSeatHoleLayout(seat, MOSAIC_SEAT_COUNT, ringW, ringH, inward)
    const holePoint = pctPoint(hole.leftPct, hole.topPct, ringW, ringH)
    const width = holeCardW > 0 ? holeCardW * 1.7 : 64 * holeCardScale * 1.7
    const height = holeCardH > 0 ? holeCardH : 96 * holeCardScale
    obstacles.push(holeBox(holePoint, width, height, mode === 'broadcast' ? 'center' : 'bottom'))
  }
  const marks = placeBetPushes({ ringW, ringH, center, seats, pushes, obstacles })
  return <FeltBetPushMarks marks={marks} />
}

