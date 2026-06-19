import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  formatTriviaNumber,
  isVenueTileWageringPaused,
  venueTileActingSeatIndex,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot, SeatBettingAction } from '@qhe/net'

import seatChipStackImg from './assets/seat-chip-stack.png'
import ShowdownResultsPanel from './ShowdownResultsPanel'
import {
  buildFloorShowdownPresentation,
  resolveShowdownDisplayPot,
} from './VenueFloorShowdownOverlay'
import { VenueFloorShowdownByVariant } from './venueFloorShowdownVariants'
import { mosaicSeatDotPct, venueMosaicFeltCenterPct } from './venueMosaicSeatGeometry'
import { showdownCorrectAnswerFromTile, showdownCorrectAnswerRowFromTile, showdownRowsFromTile, resolveVenueShowdownAnswer } from './showdownDisplay'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import { buildVenueWallTileRows, buildVenueCondenseProgress, resolveVenueHeadlineSource, showdownTableNums, venueHasOpenWagering, venueHeadlineDivergenceNote, venueWallBlindsHeadline, venueWallCondenseHeadline, venueWallPhaseLabel, VENUE_WALL_SEAT_SLOTS } from './venueWallModel'
import { formatVenueBankroll } from './venueLeaderboard'
import VenueCondenseProgressBar from './VenueCondenseProgressBar'
import {
  DISPLAY_TEXT_HEADLINE_BADGE,
  DISPLAY_TEXT_HEADLINE_META,
} from './displayTypography'
import { venueWallUiScaleFrameStyle } from './venueWallUiScale'
import {
  banquetCheckerboardGridColumn,
  banquetCheckerboardTrackCount,
  chunkTilesIntoBanquetRows,
  populatedVenueTiles,
  venueBanquetLayout,
  applyVenueFloorDenseTuning,
  venueFloorDenseTuning,
  venueFloorGridPaddingRem,
  venueFloorGridPerspectiveStyle,
  venueFloorRowTrackSpec,
  venueFloorSizeSpec,
  type VenueFloorSizeSpec,
  type VenueFloorTableSize,
  VENUE_FLOOR_MOSAIC_HEADER_TYPE,
  VENUE_FLOOR_MOSAIC_FELT_WIDTH_CLASS,
} from './venueFloorGridLayout'
import { capsuleBorderRadiusCss, capsuleBoundaryHitPx } from './tableRimGeometry'
import { nowOnServerClock } from './serverClock'

const VENUE_SEAT_SLOTS = VENUE_WALL_SEAT_SLOTS

/** Stacking inside each mini felt ({@link SeatRingWithLabels}): name + bankroll beside name always top; then center hint, badges, pile, rim. */
const SEAT_LAYER_FELT_POT = 'z-[108]'
const SEAT_LAYER_DOT = 'z-[20]'
const SEAT_LAYER_FELT_CHIP_PILE = 'z-[115]'
const SEAT_LAYER_BLIND_OUT = 'z-[117]'
const SEAT_LAYER_ACTION_PANEL = 'z-[118]'
const SEAT_LAYER_NAME_CLUSTER = 'z-[120]'


function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Pot dollars — pulses when the venue snapshot posts a new amount. */
function VenuePotAmount({
  amount,
  className,
  prefersReducedMotion,
}: {
  amount: number
  className: string
  prefersReducedMotion: boolean
}) {
  const label = formatVenueBankroll(amount)
  if (prefersReducedMotion) {
    return <span className={className}>{label}</span>
  }
  return (
    <motion.span
      key={label}
      className={className}
      initial={{ scale: 1.12, opacity: 0.72 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {label}
    </motion.span>
  )
}

/** Community board and/or pot — centered on mosaic felt. */
function VenueMosaicFeltCenterStack({
  communityDigits,
  pot,
  potClass,
  potMuted,
  prefersReducedMotion,
}: {
  communityDigits: number[]
  pot?: number | null
  potClass?: string
  potMuted?: 'dim' | 'faint' | 'live'
  prefersReducedMotion: boolean
}) {
  const feltBounds = venueFeltBoundsFrac()
  const showPot = pot != null && potClass != null
  if (communityDigits.length === 0 && !showPot) return null
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${SEAT_LAYER_FELT_POT}`}
      aria-hidden={communityDigits.length === 0 && !showPot}
    >
      <div
        className="flex max-w-[88%] flex-col items-center justify-center gap-0.5 text-center"
        style={{
          position: 'absolute',
          left: `${feltBounds.cx * 100}%`,
          top: `${feltBounds.cy * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {communityDigits.length > 0 ? (
          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
            {communityDigits.map((digit, i) => (
              <MosaicDigitCard key={`${i}-${digit}`} digit={digit} size="community" />
            ))}
          </div>
        ) : null}
        {showPot ? (
          <VenuePotAmount
            amount={pot}
            prefersReducedMotion={prefersReducedMotion}
            className={`block truncate font-mono font-black tabular-nums leading-tight tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] ${potClass} ${
              potMuted === 'faint'
                ? 'text-yellow-300/40'
                : potMuted === 'dim'
                  ? 'text-yellow-300/75'
                  : 'text-yellow-300'
            }`}
          />
        ) : null}
      </div>
    </div>
  )
}

/** Toward-table-center hint by the acting seat: call amount only (active player only). */
function formatActingCallHint(amount: number): string {
  if (amount <= 0) return 'No call to match'
  return `Call ${formatVenueBankroll(amount)}`
}

/** Caption under Pot (local) on mosaic tiles — e.g. “Pat Q. to call: $40”. */
function mosaicPotSubtitleActingToCall(args: {
  actingSeatIndex: number | null
  seatNames: string[]
  actingCallAmount: number | null | undefined
}): string | null {
  if (args.actingSeatIndex == null) return null
  if (args.actingCallAmount == null || typeof args.actingCallAmount !== 'number') return null
  const seat = args.actingSeatIndex
  if (seat < 0 || seat >= VENUE_SEAT_SLOTS) return null
  const raw = args.seatNames[seat]?.trim() ?? ''
  const name = raw || `Seat ${seat + 1}`
  return `${name} to call: ${formatVenueBankroll(args.actingCallAmount)}`
}

/** Player whose turn it is during open wagering. */
function mosaicActingPlayerName(
  actingSeatIndex: number | null,
  seatNames: string[]
): string | null {
  if (actingSeatIndex == null) return null
  if (actingSeatIndex < 0 || actingSeatIndex >= VENUE_SEAT_SLOTS) return null
  const raw = seatNames[actingSeatIndex]?.trim() ?? ''
  return raw || `Seat ${actingSeatIndex + 1}`
}

/** Under-felt caption during live wagering — e.g. “To Call: $40”. */
function mosaicToCallFooterLabel(actingCallAmount: number | null | undefined): string | null {
  if (actingCallAmount == null || typeof actingCallAmount !== 'number' || !Number.isFinite(actingCallAmount)) {
    return null
  }
  return `To Call: ${formatVenueBankroll(Math.max(0, Math.floor(actingCallAmount)))}`
}

/** Diagonal stamp when wagering is closed on this felt. */
function VenueMosaicNoMoreBetsWatermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center overflow-hidden rounded-xl"
      aria-hidden
    >
      <span
        className={`${VENUE_FLOOR_MOSAIC_HEADER_TYPE.noMoreBetsWatermark} -rotate-12 drop-shadow-[0_0_18px_rgba(52,211,153,0.12)]`}
      >
        NO MORE BETS
      </span>
    </div>
  )
}

function padSeatNames(raw: string[] | undefined): string[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    if (raw != null && raw[i] != null) {
      const t = String(raw[i]).trim()
      return t
    }
    return ''
  })
}

function padSeatBankrolls(raw: number[] | undefined): number[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  })
}

/** Matches server `seatFolded` (or false when absent). */
function padSeatFolded(raw: boolean[] | undefined): boolean[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => raw?.[i] === true)
}

function padSeatSubmittedAnswers(raw: (number | null | undefined)[] | undefined): (number | null)[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  })
}

function padSeatLastBettingAction(
  raw: (SeatBettingAction | null | undefined)[] | undefined
): (SeatBettingAction | null)[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    if (v === 'check' || v === 'call' || v === 'raise' || v === 'fold' || v === 'allIn') return v
    return null
  })
}

function padSeatHoleDigits(
  raw: (readonly [number, number] | null | undefined)[] | undefined
): (readonly [number, number] | null)[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const h = raw?.[i]
    if (h == null || h.length < 2) return null
    const d0 = h[0]
    const d1 = h[1]
    if (
      typeof d0 !== 'number' ||
      typeof d1 !== 'number' ||
      !Number.isInteger(d0) ||
      !Number.isInteger(d1) ||
      d0 < 0 ||
      d0 > 9 ||
      d1 < 0 ||
      d1 > 9
    ) {
      return null
    }
    return [d0, d1] as const
  })
}

const SEAT_LAYER_FELT_HOLE = 'z-[19]'

/** Digit card for mosaic felts — scales with @container on the ring. */
function MosaicDigitCard({
  digit,
  dimmed = false,
  faceDown = false,
  size = 'hole',
}: {
  digit?: number
  dimmed?: boolean
  faceDown?: boolean
  size?: 'hole' | 'community'
}) {
  const sizeClass =
    size === 'community'
      ? 'h-[clamp(2.1rem,15.5cqw,3.65rem)] w-[clamp(1.4rem,10.3cqw,2.45rem)] shrink-0'
      : 'h-[clamp(1.1rem,7.4cqw,1.75rem)] w-[clamp(0.8rem,5.3cqw,1.3rem)] shrink-0'
  const textClass =
    size === 'community'
      ? 'text-[clamp(1.1rem,8.5cqw,1.75rem)]'
      : 'text-[clamp(0.58rem,4cqw,0.82rem)]'
  if (faceDown) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border border-violet-400/50 bg-gradient-to-br from-violet-950/95 via-neutral-950 to-violet-900/90 text-[clamp(0.52rem,3.5cqw,0.75rem)] leading-none shadow-sm shadow-violet-500/25 ${sizeClass}`}
        aria-hidden
      >
        <span className="text-violet-300/80">✦</span>
      </span>
    )
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[4px] border font-mono font-black tabular-nums leading-none shadow-sm ${
        dimmed
          ? 'border-white/15 bg-black/40 text-white/35'
          : 'border-cyan-400/55 bg-neutral-950/95 text-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
      } ${sizeClass} ${textClass}`}
      aria-hidden
    >
      {digit}
    </span>
  )
}

/** Two face-down hole cards — bottom card peeking out from under the top card. */
function MosaicHoleCardPair() {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: 'clamp(1.25rem, 8.9cqw, 2rem)',
        height: 'clamp(1.25rem, 8.5cqw, 1.95rem)',
      }}
      aria-hidden
    >
      <span className="absolute bottom-0 left-0 z-[1] -rotate-[3deg] origin-[85%_100%]">
        <MosaicDigitCard faceDown />
      </span>
      <span className="absolute bottom-[12%] left-[30%] z-[2] rotate-[3deg] origin-[15%_100%] shadow-[0_1px_3px_rgba(0,0,0,0.55)]">
        <MosaicDigitCard faceDown />
      </span>
    </div>
  )
}

function mosaicSeatInwardPct(
  seatIndex: number,
  seatCount: number,
  w: number,
  h: number,
  inwardFrac = 0.12
): { leftPct: number; topPct: number } {
  const outer = mosaicSeatDotPct(seatIndex, seatCount, w, h)
  const center = venueMosaicFeltCenterPct()
  return {
    leftPct: outer.leftPct + (center.leftPct - outer.leftPct) * inwardFrac,
    topPct: outer.topPct + (center.topPct - outer.topPct) * inwardFrac,
  }
}

const SEAT_BETTING_ACTION_LABELS: Record<SeatBettingAction, string> = {
  check: 'CHECK',
  call: 'CALL',
  raise: 'RAISE',
  fold: 'FOLD',
  allIn: 'ALL-IN',
}

const SEAT_BETTING_ACTION_PILL_CLASS: Record<SeatBettingAction, string> = {
  check: 'border-slate-400/45 bg-slate-900/92 text-slate-100',
  call: 'border-sky-500/40 bg-sky-950/90 text-sky-100',
  raise: 'border-amber-500/45 bg-amber-950/90 text-amber-100',
  fold: 'border-rose-400/45 bg-rose-950/92 text-rose-100',
  allIn: 'border-violet-500/45 bg-violet-950/90 text-violet-100',
}

function seatBettingActionLabel(action: SeatBettingAction): string {
  return SEAT_BETTING_ACTION_LABELS[action]
}

function seatBettingActionPillClass(action: SeatBettingAction): string {
  return SEAT_BETTING_ACTION_PILL_CLASS[action]
}

/** Mini-table wrapper aspect (width / height). */
const VENUE_RING_ASPECT_MD = 8 / 5
const VENUE_RING_ASPECT_LG = 14 / 8

/** Amber rail — mosaic uses full wrapper; full mode insets slightly. */
const VENUE_RAIL_INSET_TOP = 0.02
const VENUE_RAIL_INSET_RIGHT = 0.02
const VENUE_RAIL_INSET_BOTTOM = 0.02
const VENUE_RAIL_INSET_LEFT = 0.02
const VENUE_RAIL_INSET_MOSAIC = 0

/** Green felt inset inside the rail. */
const VENUE_FELT_INSET_TOP = 0.1
const VENUE_FELT_INSET_RIGHT = 0.06
const VENUE_FELT_INSET_BOTTOM = 0.13
const VENUE_FELT_INSET_LEFT = 0.06

function venueRailBoundsFrac() {
  const innerW = 1 - VENUE_RAIL_INSET_LEFT - VENUE_RAIL_INSET_RIGHT
  const innerH = 1 - VENUE_RAIL_INSET_TOP - VENUE_RAIL_INSET_BOTTOM
  return {
    cx: VENUE_RAIL_INSET_LEFT + innerW / 2,
    cy: VENUE_RAIL_INSET_TOP + innerH / 2,
    halfW: innerW / 2,
    halfH: innerH / 2,
    innerW,
    innerH,
  }
}

function venueFeltBoundsFrac() {
  const innerW = 1 - VENUE_FELT_INSET_LEFT - VENUE_FELT_INSET_RIGHT
  const innerH = 1 - VENUE_FELT_INSET_TOP - VENUE_FELT_INSET_BOTTOM
  return {
    cx: VENUE_FELT_INSET_LEFT + innerW / 2,
    cy: VENUE_FELT_INSET_TOP + innerH / 2,
    halfW: innerW / 2,
    halfH: innerH / 2,
    innerW,
    innerH,
  }
}

function venueSeatRimPxAndOutwardNormal(
  seatIndex: number,
  w: number,
  h: number,
  radialScale: number,
  target: 'rail' | 'felt' = 'rail'
): { rimX: number; rimY: number; ux: number; uy: number } {
  const bounds = target === 'rail' ? venueRailBoundsFrac() : venueFeltBoundsFrac()
  const cx = bounds.cx * w
  const cy = bounds.cy * h
  const halfW = bounds.halfW * w
  const halfH = bounds.halfH * h
  const θ = seatThetaRad(seatIndex)
  const hit = capsuleBoundaryHitPx(cx, cy, halfW, halfH, Math.cos(θ), Math.sin(θ))
  if (!hit) return { rimX: cx, rimY: cy, ux: 0, uy: -1 }
  return {
    rimX: cx + (hit.x - cx) * radialScale,
    rimY: cy + (hit.y - cy) * radialScale,
    ux: hit.nx,
    uy: hit.ny,
  }
}

/**
 * Seat rim in wrapper %. Seat index 0 at clock top; advances CCW when viewed from above.
 * @param radialScale 1 = on rail outer boundary, < 1 inward toward center.
 */
function venueSeatRimPct(
  seatIndex: number,
  radialScale: number,
  w = 0,
  h = 0,
  target: 'rail' | 'felt' = 'rail'
): { leftPct: number; topPct: number } {
  const aspect = w > 0 && h > 0 ? w / h : VENUE_RING_ASPECT_MD
  const ww = w > 0 ? w : 260 * aspect
  const hh = h > 0 ? h : 260
  const { rimX, rimY } = venueSeatRimPxAndOutwardNormal(seatIndex, ww, hh, radialScale, target)
  return { leftPct: (rimX / ww) * 100, topPct: (rimY / hh) * 100 }
}

/** Polar angle θ for seat i (matches {@link venueSeatRimPct}). */
function seatThetaRad(seatIndex: number): number {
  return (seatIndex / VENUE_SEAT_SLOTS) * 2 * Math.PI - Math.PI / 2
}

/** Nudge pole labels toward beltline (top downward, bottom upward); east/west stay put. */
const SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_MD = 5
const SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_LG = 7

function seatNameLabelVerticalNudgePx(seatIndex: number, size: 'md' | 'lg'): number {
  const amp = size === 'lg' ? SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_LG : SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_MD
  return -Math.sin(seatThetaRad(seatIndex)) * amp
}

type VenueWallBlindSeats = {
  dealerSeatIndex: number | null
  smallBlindSeatIndex: number | null
  bigBlindSeatIndex: number | null
}

function blindTagsForSeat(seatIndex: number, blindSeats: VenueWallBlindSeats) {
  const out: { key: string; label: string; short: string; pill: string }[] = []
  if (blindSeats.dealerSeatIndex === seatIndex) {
    out.push({
      key: 'btn',
      label: 'Dealer button',
      short: 'BTN',
      pill: 'border-amber-700/40 bg-amber-400 text-black shadow-sm',
    })
  }
  if (blindSeats.smallBlindSeatIndex === seatIndex) {
    out.push({
      key: 'sb',
      label: 'Small blind',
      short: 'SB',
      pill: 'border-sky-900/35 bg-sky-500 text-white shadow-sm',
    })
  }
  if (blindSeats.bigBlindSeatIndex === seatIndex) {
    out.push({
      key: 'bb',
      label: 'Big blind',
      short: 'BB',
      pill: 'border-rose-900/40 bg-rose-600 text-white shadow-sm',
    })
  }
  return out
}

function venueTileBlindSeats(row: DisplayVenueTileSnapshot): VenueWallBlindSeats | null {
  if (
    row.dealerSeatIndex === undefined &&
    row.smallBlindSeatIndex === undefined &&
    row.bigBlindSeatIndex === undefined
  ) {
    return null
  }
  return {
    dealerSeatIndex: row.dealerSeatIndex ?? null,
    smallBlindSeatIndex: row.smallBlindSeatIndex ?? null,
    bigBlindSeatIndex: row.bigBlindSeatIndex ?? null,
  }
}

function venueTileActingSeat(row: DisplayVenueTileSnapshot): number | null {
  return venueTileActingSeatIndex(row)
}

function mosaicWagerStyleFlags(
  row: DisplayVenueTileSnapshot,
  waitingOnOthersToAnswer = false
): { showNoMoreBets: boolean; wageringLive: boolean } {
  const ph = String(row.phase ?? '').trim().toLowerCase()
  const showNoMoreBets =
    row.seated >= 2 &&
    ((ph === 'betting' && isVenueTileWageringPaused(row)) ||
      (ph === 'answering' && waitingOnOthersToAnswer))
  const wageringLive =
    ph === 'betting' &&
    row.seated >= 2 &&
    row.isBettingOpen === true &&
    !isVenueTileWageringPaused(row)
  return { showNoMoreBets, wageringLive }
}

function mosaicPhaseLabel(row: DisplayVenueTileSnapshot, showNoMoreBets: boolean, dense = false): string {
  if (showNoMoreBets) return dense ? 'NO BET' : 'NO MORE BETS'
  const ph = String(row.phase ?? '').trim().toLowerCase()
  if (dense) {
    if (ph === 'betting') return 'WAGER'
    if (ph === 'question') return 'Setup'
    if (ph === 'answering') return 'Answer'
    if (ph === 'showdown') return 'Showdown'
    if (ph === 'intermission') return 'Break'
  }
  if (ph === 'betting' && row.seated >= 2 && row.isBettingOpen === true) {
    return 'Wagering'
  }
  return phaseLabel(row.phase)
}

function mosaicPhaseAccent(row: DisplayVenueTileSnapshot, showNoMoreBets: boolean, wageringLive: boolean): string {
  if (showNoMoreBets && row.seated >= 2) {
    return 'bg-emerald-400 font-black text-black shadow-[0_0_10px_rgba(52,211,153,0.45)] ring-0'
  }
  if (wageringLive) {
    return 'bg-amber-400 font-black text-black shadow-[0_0_10px_rgba(251,191,36,0.35)] ring-0'
  }
  return phaseAccent(row.phase)
}

/** Corner phase pill typography — paused betting stays on one line in narrow tiles. */
function mosaicSeatInitialsClass(density: VenueFloorTableSize | undefined): string {
  if (density === 'micro' || density === 'compact' || density === 'medium') {
    return VENUE_FLOOR_MOSAIC_HEADER_TYPE.seatInitials
  }
  return 'text-[clamp(0.5rem,min(7cqw,9cqh),0.8rem)]'
}

function mosaicPhaseCornerTypography(
  row: DisplayVenueTileSnapshot,
  showNoMoreBets: boolean,
  wageringLive: boolean
): string {
  if (showNoMoreBets && row.seated >= 2) {
    return 'whitespace-nowrap font-black uppercase leading-none tracking-tight'
  }
  if (wageringLive) {
    return 'truncate font-black uppercase leading-none tracking-wide'
  }
  return 'truncate font-bold uppercase leading-none'
}
function fallbackLabelEllipseScale(size: 'md' | 'lg', feltStacks: boolean): number {
  if (size === 'lg') return feltStacks ? 1.045 : 1.03
  return feltStacks ? 1.04 : 1.025
}

/** Dot diameters match Tailwind classes on seat markers ({@link SeatRingWithLabels}). */
function seatDotDiameterPx(
  rootRemPx: number,
  size: 'md' | 'lg',
  mosaic = false
): number {
  if (mosaic) return 1.25 * rootRemPx
  if (size !== 'lg') return 1.75 * rootRemPx
  const sm =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(min-width:640px)').matches
  return (sm ? 3.15 : 2.8375) * rootRemPx
}

/**
 * Outward label anchor in wrapper % so labels sit outside seat dots, clear the chip band (lg hero),
 * avoid other seat markers, and spread along the tangent when adjacent names would crowd.
 */
function computeSeatLabelAnchorsPct(args: {
  w: number
  h: number
  size: 'md' | 'lg'
  feltSeatStacks: boolean
  seatNames: string[]
}): ({ leftPct: number; topPct: number } | null)[] {
  const { w, h, size, feltSeatStacks, seatNames } = args
  const empty = () =>
    Array.from({ length: VENUE_SEAT_SLOTS }, () => null as { leftPct: number; topPct: number } | null)
  if (!(w > 0 && h > 0)) return empty()

  const rootRem =
    typeof document !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16
  const dotR = seatDotDiameterPx(rootRem, size) / 2
  /** Half of approx. name block inward toward the felt (smaller = labels sit tighter to the rim). */
  const labelHalfInwardPx =
    size === 'lg' ? (feltSeatStacks ? 14 : 18) : 12
  /** lg hero: chip PNG + bankroll radial band — modest push so names avoid larger stacks nearer the rim. */
  const chipBandClearancePx = feltSeatStacks && size === 'lg' ? 16 : 0
  const padPx = 1
  const neighborDotPadPx = 2
  const estLabelHalfWidthPx =
    size === 'lg' ? Math.min(0.34 * w, 12 * rootRem) / 2 : Math.min(0.5 * w, 8.5 * rootRem) / 2
  const labelPairMinDistPx = 2 * estLabelHalfWidthPx * 0.64 + 2

  const rimCache = Array.from({ length: VENUE_SEAT_SLOTS }, (_, j) =>
    venueSeatRimPxAndOutwardNormal(j, w, h, 1)
  )

  const out = empty()
  const priors: { x: number; y: number }[] = []

  const orderedSeats = Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => i).filter(
    (i) => (seatNames[i]?.trim() ?? '').length > 0
  )

  for (const i of orderedSeats) {
    const { rimX, rimY, ux, uy } = rimCache[i]!
    const tux = -uy
    const tuy = ux

    let dPx = dotR + padPx + labelHalfInwardPx + chipBandClearancePx
    let kTan = 0
    let lx = rimX
    let ly = rimY

    const dotsClear = (xx: number, yy: number) => {
      for (let j = 0; j < VENUE_SEAT_SLOTS; j++) {
        const rj = rimCache[j]!
        if (Math.hypot(xx - rj.rimX, yy - rj.rimY) < dotR + neighborDotPadPx) return false
      }
      return true
    }

    const labelsClear = (xx: number, yy: number) => {
      for (const p of priors) {
        if (Math.hypot(xx - p.x, yy - p.y) < labelPairMinDistPx) return false
      }
      return true
    }

    let placed = false
    for (let step = 0; step < 48 && !placed; step++) {
      lx = rimX + ux * dPx + tux * kTan
      ly = rimY + uy * dPx + tuy * kTan

      if (!dotsClear(lx, ly)) {
        dPx += 2
        continue
      }
      if (labelsClear(lx, ly)) {
        placed = true
        break
      }

      const dir = i % 2 === 0 ? 1 : -1
      kTan += dir * 6
      if (Math.abs(kTan) > 52) {
        kTan = 0
        dPx += 3
      }
    }

    if (!placed) {
      lx = rimX + ux * dPx + tux * kTan
      ly = rimY + uy * dPx + tuy * kTan
    }

    priors.push({ x: lx, y: ly })
    out[i] = { leftPct: (lx / w) * 100, topPct: (ly / h) * 100 }
  }

  return out
}

/**
 * Eight seat positions around the mini felt; optional name chips just outside each chair.
 */
function SeatRingWithLabels({
  seatedCount,
  seatNames,
  seatBankrolls,
  size = 'md',
  ringMode = 'mosaic',
  feltSeatStacks = false,
  blindSeats = null,
  seatFolded: seatFoldedIn,
  actingSeatIndex = null,
  showSeatBettingActions = false,
  seatLastBettingAction: seatLastBettingActionIn,
  actingCallAmount,
  mosaicFluidWidth = false,
  /** Honeycomb floor density — drives legible mosaic seat markers on dense grids. */
  mosaicDensity,
  /** Honeycomb floor — shrink-wrap felt height (content-sized rows, no 1fr stretch). */
  mosaicShrinkWrap = false,
  mosaicFeltAspectClass,
  mosaicFeltWidthClass,
  mosaicCenterPot = null,
  mosaicCenterPotClass = '',
  mosaicCenterPotMuted = 'live' as 'dim' | 'faint' | 'live',
  /** Showdown: seat indexes (0-based) that won chip pot / trivia tie — amber rim on mosaic dots. */
  winnerSeatIndexes = null,
  /** Mosaic: hole-card digits per physical seat (parallel to seatNames). */
  seatHoleDigits: seatHoleDigitsIn,
  /** Mosaic: community board digits (0–5 cards). */
  communityDigits: communityDigitsIn,
  /** Mosaic: wagering street complete on this felt. */
  betsInPaused = false,
  /** Mosaic: per-seat locked trivia answers during answering. */
  seatSubmittedAnswers: seatSubmittedAnswersIn,
  answeringPhase = false,
}: {
  seatedCount: number
  seatNames: string[]
  seatBankrolls: number[]
  size?: 'md' | 'lg'
  /** `mosaic` = rail + seat dots only (crawl tiles); `full` = names, actions, and felt stacks. */
  ringMode?: 'mosaic' | 'full'
  /** Honeycomb floor: ring scales with tile width (no fixed 8.75rem height). */
  mosaicFluidWidth?: boolean
  mosaicDensity?: VenueFloorTableSize
  mosaicShrinkWrap?: boolean
  mosaicFeltAspectClass?: string
  mosaicFeltWidthClass?: string
  mosaicCenterPot?: number | null
  mosaicCenterPotClass?: string
  mosaicCenterPotMuted?: 'dim' | 'faint' | 'live'
  /** Spotlight hero: draw mini chip stack + bankroll on the felt by each seated player. */
  feltSeatStacks?: boolean
  /** Dealer / blind roles (indexes match `seatNames`). Null when unsupported or omitted by server snapshot. */
  blindSeats?: VenueWallBlindSeats | null
  /** Folded seats this hand (same indexing as `seatNames`); absent means none. */
  seatFolded?: boolean[]
  /** Pulse this seat rim during open betting; null hides. Matches `seatNames` index. */
  actingSeatIndex?: number | null
  /** While wagering: show each seat’s latest check / call / raise / fold / all-in this street. */
  showSeatBettingActions?: boolean
  /** Parallel to `seatNames`; from server `seatLastBettingAction`. */
  seatLastBettingAction?: (SeatBettingAction | null)[]
  /** Active seat only: chips to call (venue snapshot). */
  actingCallAmount?: number | null
  winnerSeatIndexes?: ReadonlySet<number> | null
  seatHoleDigits?: (readonly [number, number] | null)[]
  communityDigits?: number[]
  betsInPaused?: boolean
  seatSubmittedAnswers?: (number | null)[]
  answeringPhase?: boolean
}) {
  function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n))
  }

  const seatFolded = padSeatFolded(seatFoldedIn)
  const seatLastBettingAction = padSeatLastBettingAction(seatLastBettingActionIn)
  const seatHoleDigits = padSeatHoleDigits(seatHoleDigitsIn)
  const seatSubmittedAnswers = padSeatSubmittedAnswers(seatSubmittedAnswersIn)
  const communityDigits =
    communityDigitsIn?.filter((d) => Number.isInteger(d) && d >= 0 && d <= 9) ?? []
  const prefersReducedMotion = usePrefersReducedMotion()
  const isMosaic = ringMode === 'mosaic'
  const ringAspect = size === 'lg' ? VENUE_RING_ASPECT_LG : VENUE_RING_ASPECT_MD
  const railInsetTop = isMosaic ? VENUE_RAIL_INSET_MOSAIC : VENUE_RAIL_INSET_TOP
  const railInsetRight = isMosaic ? VENUE_RAIL_INSET_MOSAIC : VENUE_RAIL_INSET_RIGHT
  const railInsetBottom = isMosaic ? VENUE_RAIL_INSET_MOSAIC : VENUE_RAIL_INSET_BOTTOM
  const railInsetLeft = isMosaic ? VENUE_RAIL_INSET_MOSAIC : VENUE_RAIL_INSET_LEFT
  const feltBounds = venueFeltBoundsFrac()
  /** Spotlight hero — wide capsule; mosaic tiles use smaller md ring below. */
  const lgRing =
    'mx-auto aspect-[14/8] h-auto max-h-[min(min(68svh,57dvh),36rem)] w-[min(100%,calc(100dvw-2.5rem),68rem)] max-w-full shrink-0'
  /** Mosaic crawl — stadium capsule; fill the grid cell (width-first, height capped). */
  const mdRing = isMosaic
    ? mosaicFluidWidth
      ? mosaicShrinkWrap
        ? `relative ${mosaicFeltAspectClass ?? 'aspect-[17/10]'} h-auto shrink-0 ${mosaicFeltWidthClass ?? VENUE_FLOOR_MOSAIC_FELT_WIDTH_CLASS}`
        : 'relative mx-auto aspect-[8/5] h-auto w-full max-h-full max-w-full min-h-0 min-w-0'
      : 'relative mx-auto aspect-[8/5] h-[8.75rem] w-full max-w-[16.5rem] shrink-0'
    : 'mx-auto aspect-[13/8] h-auto w-full max-w-[min(100%,22rem)] shrink-0 sm:max-w-[min(100%,23rem)]'
  const wrap = size === 'lg' ? lgRing : mdRing
  const dot = isMosaic
    ? 'h-[1.35rem] w-[1.35rem] border-[1.5px]'
    : size === 'lg'
      ? 'h-[2.8375rem] w-[2.8375rem] sm:h-[3.15rem] sm:w-[3.15rem]'
      : 'h-7 w-7'
  /** Larger rim marker for the player on the clock — reads from the back of the room. */
  const dotActing = isMosaic
    ? 'h-[1.6rem] w-[1.6rem] border-[2px] ring-2 ring-cyan-400/70'
    : size === 'lg'
      ? 'h-[3.5rem] w-[3.5rem] sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]'
      : 'h-10 w-10 sm:h-11 sm:w-11'
  const labelClass =
    size === 'lg'
      ? 'max-w-[min(12rem,34vw)] text-[1.125rem] leading-tight sm:text-[1.3rem] sm:leading-snug md:text-[1.5625rem]'
      : 'max-w-[min(7.125rem,46%)] text-[0.6875rem] leading-tight sm:max-w-[min(7.75rem,48%)] sm:text-xs md:text-sm'

  /** Bankroll stack on felt: radial scale toward seat (1 = on rim dot); larger = nearer table edge / seat marker. */
  const chipInnerScale = 0.635

  const ringElRef = useRef<HTMLDivElement>(null)
  const [ringPx, setRingPx] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ringElRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const apply = () => {
      const r = el.getBoundingClientRect()
      const ww = r.width
      const hh = r.height
      if (ww > 0 && hh > 0)
        setRingPx((prev) => (prev.w === ww && prev.h === hh ? prev : { w: ww, h: hh }))
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const labelAnchorsPct = useMemo(() => {
    if (isMosaic) {
      return Array.from({ length: VENUE_SEAT_SLOTS }, () => null as { leftPct: number; topPct: number } | null)
    }
    return computeSeatLabelAnchorsPct({
      w: ringPx.w,
      h: ringPx.h,
      size,
      feltSeatStacks,
      seatNames,
    })
  }, [feltSeatStacks, isMosaic, ringPx.h, ringPx.w, seatNames, size])

  const rimW = ringPx.w
  const rimH = ringPx.h
  const railW = rimW * (1 - railInsetLeft - railInsetRight)
  const railH = rimH * (1 - railInsetTop - railInsetBottom)
  const railBorderRadius =
    railW > 0 && railH > 0
      ? capsuleBorderRadiusCss(railW, railH)
      : capsuleBorderRadiusCss(220 * ringAspect, 220)
  const feltBorderRadius =
    rimW > 0 && rimH > 0
      ? capsuleBorderRadiusCss(
          rimW * feltBounds.innerW,
          rimH * feltBounds.innerH
        )
      : railBorderRadius

  const showFeltBoardCenter =
    isMosaic && (communityDigits.length > 0 || mosaicCenterPot != null)

  const mosaicScale = useMemo(() => {
    if (!isMosaic) return 1
    const w = ringPx.w
    if (!(w > 0)) return 1
    if (mosaicDensity === 'micro') return clamp(w / 240, 0.82, 1.05)
    if (mosaicDensity === 'compact') return clamp(w / 230, 0.88, 1.12)
    if (mosaicDensity === 'medium') return clamp(w / 220, 0.92, 1.2)
    return clamp(w / 220, 1, 1.35)
  }, [isMosaic, mosaicDensity, ringPx.w])

  const mosaicDotPx = 28 * mosaicScale
  const mosaicDotActingPx = 32 * mosaicScale
  const mosaicHideHoleCards = mosaicDensity === 'micro' || mosaicDensity === 'compact'

  return (
    <div ref={ringElRef} className={`@container relative ${isMosaic ? 'overflow-hidden' : 'overflow-visible'} ${wrap}`}>
      <div
        className={`absolute border-amber-700/90 shadow-md ${
          size === 'lg'
            ? 'border-2 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 sm:border-[3px]'
            : 'border-2 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950'
        }`}
        style={{
          top: `${railInsetTop * 100}%`,
          right: `${railInsetRight * 100}%`,
          bottom: `${railInsetBottom * 100}%`,
          left: `${railInsetLeft * 100}%`,
          borderRadius: railBorderRadius,
        }}
      />
      <div
        className={`absolute shadow-inner ${
          size === 'lg' ? 'border-2 sm:border-[3px]' : 'border-2'
        } ${
          isMosaic && betsInPaused
            ? 'border-transparent brightness-[0.72] saturate-[0.45]'
            : 'border-amber-700/70'
        }`}
        style={{
          top: `${VENUE_FELT_INSET_TOP * 100}%`,
          right: `${VENUE_FELT_INSET_RIGHT * 100}%`,
          bottom: `${VENUE_FELT_INSET_BOTTOM * 100}%`,
          left: `${VENUE_FELT_INSET_LEFT * 100}%`,
          borderRadius: feltBorderRadius,
          background: isMosaic && betsInPaused
            ? 'linear-gradient(135deg, #1a4a30 0%, #0f2818 100%)'
            : `
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
      {isMosaic && betsInPaused ? (
        <div
          className="pointer-events-none absolute z-[11] bg-emerald-500/12"
          style={{
            top: `${VENUE_FELT_INSET_TOP * 100}%`,
            right: `${VENUE_FELT_INSET_RIGHT * 100}%`,
            bottom: `${VENUE_FELT_INSET_BOTTOM * 100}%`,
            left: `${VENUE_FELT_INSET_LEFT * 100}%`,
            borderRadius: feltBorderRadius,
          }}
          aria-hidden
        />
      ) : null}
      {showFeltBoardCenter ? (
        <VenueMosaicFeltCenterStack
          communityDigits={communityDigits}
          pot={mosaicCenterPot}
          potClass={mosaicCenterPotClass}
          potMuted={mosaicCenterPotMuted}
          prefersReducedMotion={prefersReducedMotion}
        />
      ) : null}
      {Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
        const filled = i < seatedCount
        if (isMosaic && !filled) return null

        const seatRim = isMosaic
          ? mosaicSeatDotPct(i, seatedCount, rimW, rimH)
          : venueSeatRimPct(i, 1, rimW, rimH)
        const chipPos = venueSeatRimPct(i, chipInnerScale, rimW, rimH, 'felt')
        const anchored = labelAnchorsPct[i]
        const fb = fallbackLabelEllipseScale(size, Boolean(feltSeatStacks && size === 'lg'))
        const fallbackPos = venueSeatRimPct(i, fb, rimW, rimH)
        const labelPos = anchored ?? fallbackPos
        const raw = seatNames[i]?.trim() ?? ''
        const mosaicInitials =
          isMosaic && raw.length > 0
            ? raw
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : ''
        const chips = seatBankrolls[i] ?? 0
        const showFeltStack = Boolean(raw && feltSeatStacks && size === 'lg')
        const labelVy = seatNameLabelVerticalNudgePx(i, size)
        const isFolded = filled && seatFolded[i] === true
        const lastBetAct =
          showSeatBettingActions && filled ? seatLastBettingAction[i] ?? null : null
        const showFoldOut = isFolded && !(showSeatBettingActions && lastBetAct === 'fold')
        const isActing = filled && actingSeatIndex != null && actingSeatIndex === i && !isFolded
        const answerLocked =
          filled &&
          answeringPhase &&
          !isFolded &&
          seatSubmittedAnswers[i] != null
        const isWinner =
          filled &&
          !isFolded &&
          winnerSeatIndexes != null &&
          winnerSeatIndexes.has(i)
        const showActingCallLine =
          isActing &&
          showSeatBettingActions &&
          actingCallAmount != null &&
          typeof actingCallAmount === 'number'
        const showActionPanel = Boolean(lastBetAct != null || showActingCallLine)
        /** Below the name/stack cluster — keeps CHECK / CALL off the felt center. */
        const actionPanelBelowPx =
          (size === 'lg' ? 44 : 36) + (feltSeatStacks && size === 'lg' ? 10 : 0)
        const seatDotClass = (() => {
          if (isActing && prefersReducedMotion) {
            return 'border-[3px] border-amber-200/95 bg-neutral-950 shadow-[0_0_14px_rgba(234,179,8,0.4)]'
          }
          if (isActing) {
            return 'border-[3px] border-amber-300/85 bg-neutral-950 shadow-[0_0_14px_rgba(234,179,8,0.35)] ring-1 ring-amber-400/25'
          }
          if (answerLocked) {
            return 'border-[3px] border-cyan-300/95 bg-cyan-950/90 shadow-[0_0_14px_rgba(34,211,238,0.55)] ring-2 ring-cyan-400/50'
          }
          if (isWinner) {
            return 'border-[3px] border-amber-300/95 bg-amber-950/95 shadow-[0_0_14px_rgba(251,191,36,0.5)] ring-2 ring-amber-400/45'
          }
          if (isFolded) {
            return 'border-rose-500/50 bg-black/50 shadow-inner opacity-[0.78] saturate-[0.7]'
          }
          return filled ? 'border-emerald-300/70 bg-black/85' : 'border-white/20 bg-black/35'
        })()
        const actingSoftPulse = isMosaic
          ? 'pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/12 motion-reduce:hidden'
          : size === 'lg'
            ? 'pointer-events-none absolute left-1/2 top-1/2 z-0 h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/12 motion-reduce:hidden sm:h-[5rem] sm:w-[5rem]'
            : 'pointer-events-none absolute left-1/2 top-1/2 z-0 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/10 motion-reduce:hidden sm:h-[3.75rem] sm:w-[3.75rem]'
        return (
          <div key={i}>
            <div
              className={`absolute flex items-center justify-center ${SEAT_LAYER_DOT}`}
              style={{
                left: `${seatRim.leftPct}%`,
                top: `${seatRim.topPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {isActing && !prefersReducedMotion ? (
                <span
                  aria-hidden
                  className={`${actingSoftPulse} motion-safe:animate-pulse motion-safe:[animation-duration:2.8s]`}
                  style={isMosaic ? { width: mosaicDotActingPx, height: mosaicDotActingPx } : undefined}
                />
              ) : answerLocked && !prefersReducedMotion ? (
                <span
                  aria-hidden
                  className={`${actingSoftPulse} bg-cyan-400/20 motion-safe:animate-pulse motion-safe:[animation-duration:2.2s]`}
                  style={isMosaic ? { width: mosaicDotActingPx, height: mosaicDotActingPx } : undefined}
                />
              ) : isWinner && !prefersReducedMotion ? (
                <span
                  aria-hidden
                  className={`${actingSoftPulse} bg-amber-400/18 motion-safe:animate-pulse motion-safe:[animation-duration:3.2s]`}
                  style={isMosaic ? { width: mosaicDotActingPx, height: mosaicDotActingPx } : undefined}
                />
              ) : null}
              <div
                className={`relative z-[2] flex shrink-0 items-center justify-center ${
                  isMosaic ? '' : isActing || answerLocked || isWinner ? dotActing : dot
                } rounded-full border-2 shadow ${seatDotClass}`}
                style={
                  isMosaic
                    ? {
                        width: isActing || answerLocked || isWinner ? mosaicDotActingPx : mosaicDotPx,
                        height: isActing || answerLocked || isWinner ? mosaicDotActingPx : mosaicDotPx,
                      }
                    : undefined
                }
                aria-current={isActing ? true : undefined}
                aria-label={
                  raw
                    ? [
                        raw,
                        isActing ? 'has the wagering turn' : null,
                        answerLocked ? 'answer locked in' : null,
                        isWinner ? 'won the hand' : null,
                        isFolded ? 'folded' : null,
                        showActingCallLine
                          ? formatActingCallHint(actingCallAmount ?? 0)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : `Seat ${i + 1}, empty`
                }
              >
                {isMosaic && filled && mosaicInitials ? (
                  <span
                    className={`block w-full min-w-0 truncate px-0.5 text-center font-black leading-none tracking-tight text-amber-50 ${mosaicSeatInitialsClass(mosaicDensity)}`}
                  >
                    {mosaicInitials}
                  </span>
                ) : null}
              </div>
            </div>
            {isMosaic && filled && !isFolded && seatHoleDigits[i] != null && !mosaicHideHoleCards ? (() => {
              const holePos = mosaicSeatInwardPct(i, seatedCount, rimW, rimH)
              return (
                <div
                  className={`pointer-events-none absolute ${SEAT_LAYER_FELT_HOLE}`}
                  style={{
                    left: `${holePos.leftPct}%`,
                    top: `${holePos.topPct}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  aria-label="Two hole cards"
                >
                  <MosaicHoleCardPair />
                </div>
              )
            })() : null}
            {isMosaic ? null : (() => {
              if (blindSeats == null) return null
              const tags = blindTagsForSeat(i, blindSeats)
              if (tags.length === 0) return null
              const blindInset =
                feltSeatStacks && size === 'lg' ? 0.71 : size === 'lg' ? 0.8 : 0.76
              const rp = venueSeatRimPct(i, blindInset, rimW, rimH, 'felt')
              const badgeText =
                size === 'lg'
                  ? 'text-[8px] font-black leading-none tracking-tight sm:text-[9px]'
                  : 'text-[7px] font-black leading-none tracking-tight sm:text-[8px]'
              return (
                <div
                  className={`pointer-events-none absolute ${SEAT_LAYER_BLIND_OUT} flex flex-col items-center gap-px`}
                  style={{
                    left: `${rp.leftPct}%`,
                    top: `${rp.topPct}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {tags.map((t) => (
                    <span
                      key={t.key}
                      title={t.label}
                      aria-label={t.label}
                      className={`rounded border px-[3px] py-px uppercase ${badgeText} ${t.pill}`}
                    >
                      {t.short}
                    </span>
                  ))}
                </div>
              )
            })()}
            {!isMosaic && showFoldOut && raw ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_BLIND_OUT} flex flex-col items-center`}
                style={{
                  left: `${venueSeatRimPct(i, 0.58, rimW, rimH, 'felt').leftPct}%`,
                  top: `${venueSeatRimPct(i, 0.58, rimW, rimH, 'felt').topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span
                  className={`whitespace-nowrap rounded border border-rose-300/90 bg-rose-950/95 px-[3px] py-px font-black uppercase leading-none tracking-tight text-rose-100 shadow-[0_1px_4px_rgba(0,0,0,0.85)] ${
                    size === 'lg' ? 'text-[8px] sm:text-[9px]' : 'text-[7px] sm:text-[8px]'
                  }`}
                >
                  Out
                </span>
              </div>
            ) : null}
            {!isMosaic && showFeltStack ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_FELT_CHIP_PILE} flex flex-col items-center gap-0.5 px-0.5 ${
                  isFolded ? 'opacity-45' : 'opacity-95'
                }`}
                style={{
                  left: `${chipPos.leftPct}%`,
                  top: `${chipPos.topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <img
                  src={seatChipStackImg}
                  alt=""
                  width={96}
                  height={72}
                  draggable={false}
                  className="pointer-events-none h-[2.6925rem] w-auto max-w-[4.6rem] shrink-0 select-none object-contain opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:h-[3.0875rem] sm:max-w-[5.35rem]"
                />
                <span className="max-w-[10rem] text-center font-mono text-[1.16rem] font-extrabold leading-tight tabular-nums tracking-tight text-amber-50 sm:max-w-[11rem] sm:text-[1.26rem] md:text-[1.315rem] [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.85)]">
                  {formatVenueBankroll(chips)}
                </span>
              </div>
            ) : null}
            {!isMosaic && raw ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_NAME_CLUSTER} text-center font-semibold leading-tight shadow-black/80 drop-shadow ${labelClass} ${
                  isFolded ? 'text-white/60' : 'text-white/92'
                }`}
                style={{
                  left: `${labelPos.leftPct}%`,
                  top: `${labelPos.topPct}%`,
                  transform: `translate(-50%, calc(-50% + ${labelVy}px))`,
                }}
              >
                <span
                  className={`block max-w-full truncate ${isFolded ? 'line-through decoration-rose-300/85 decoration-2' : ''}`}
                >
                  {raw}
                </span>
                {(() => {
                  const showMonoStackUnderName = !(feltSeatStacks && size === 'lg')
                  return (
                    <>
                      {showMonoStackUnderName ? (
                        <span
                          className={`mt-0.5 block max-w-full truncate font-mono tabular-nums text-[0.625rem] sm:text-[0.6875rem] md:text-xs lg:text-sm ${
                            isFolded ? 'text-white/40' : 'text-casino-emerald'
                          }`}
                        >
                          {formatVenueBankroll(chips)}
                        </span>
                      ) : null}
                    </>
                  )
                })()}
              </div>
            ) : null}
            {!isMosaic && raw && showActionPanel ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_ACTION_PANEL} flex flex-col items-center gap-1 text-center`}
                style={{
                  left: `${labelPos.leftPct}%`,
                  top: `${labelPos.topPct}%`,
                  transform: `translate(-50%, calc(-50% + ${labelVy + actionPanelBelowPx}px))`,
                }}
              >
                {showActingCallLine ? (
                  <span
                    className={
                      size === 'lg'
                        ? 'max-w-[min(100vw-2rem,20rem)] whitespace-normal rounded-lg border-2 border-amber-300/45 bg-neutral-950/95 px-2.5 py-1.5 text-sm font-bold tabular-nums leading-snug text-amber-50 shadow-md ring-1 ring-amber-400/25 sm:text-base'
                        : 'max-w-[min(90vw,12rem)] whitespace-normal rounded-md border-2 border-amber-300/35 bg-neutral-950/95 px-2 py-1 text-[0.65rem] font-bold tabular-nums leading-snug text-amber-50 shadow-md sm:text-xs'
                    }
                  >
                    {formatActingCallHint(actingCallAmount ?? 0)}
                  </span>
                ) : null}
                {lastBetAct != null ? (
                  <span
                    className={`max-w-full truncate border-2 px-1.5 py-0.5 font-black uppercase leading-tight tracking-wide shadow-md ${
                      size === 'lg'
                        ? 'text-sm sm:text-base md:text-lg'
                        : 'text-[0.7rem] sm:text-xs md:text-sm'
                    } ${seatBettingActionPillClass(lastBetAct)}`}
                  >
                    {seatBettingActionLabel(lastBetAct)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function phaseLabel(ph: string) {
  if (ph === 'lobby') return 'Lobby'
  if (ph === 'question') return 'Question setup'
  if (ph === 'betting') return 'Wagering'
  if (ph === 'answering') return 'Answering'
  if (ph === 'reveal') return 'Reveal'
  if (ph === 'showdown') return 'Showdown'
  if (ph === 'payout') return 'Payout'
  if (ph === 'intermission') return 'Break'
  return ph
}

function phaseAccent(ph: string) {
  if (ph === 'answering') return 'text-amber-200 ring-1 ring-amber-400/50'
  if (ph === 'showdown') return 'text-yellow-300 ring-1 ring-yellow-400/35'
  if (ph === 'question') return 'text-emerald-200/95'
  return 'text-white/85'
}

type VenueMosaicTableCardProps = {
  row: DisplayVenueTileSnapshot
  /** Winner line only (dense floor with many tables). */
  hideShowdownResults?: boolean
  /** Row-driven felt density from {@link venueFloorSizeSpec}. */
  floorSize: VenueFloorSizeSpec
  /** Honeycomb floor — do not stretch card height to fill a row slot. */
  floorHoneycomb?: boolean
  /** Single-row floor — card height follows felt content, not viewport. */
  shrinkWrapRowHeight?: boolean
  prefersReducedMotion?: boolean
  /** Slightly dim answering tiles while other felts are still in open wagering. */
  dimAnsweringEarly?: boolean
  /** Venue-wide authoritative answer — overrides per-tile `showdownAnswer` when set. */
  sharedShowdownAnswer?: number
}

function VenueMosaicTableCard({
  row,
  hideShowdownResults = false,
  floorSize,
  floorHoneycomb = false,
  shrinkWrapRowHeight = false,
  prefersReducedMotion = false,
  dimAnsweringEarly = false,
  sharedShowdownAnswer,
}: VenueMosaicTableCardProps) {
  const tn = row.tableNum
  const seats = row.seated
  const pot = Math.max(0, Math.floor(Number.isFinite(row.pot) ? row.pot : 0))
  const ph = row.phase
  const seatNames = padSeatNames(row.seatNames)
  const seatBankrolls = padSeatBankrolls(row.seatBankrolls)
  const seatFolded = padSeatFolded(row.seatFolded)
  const blindSeatSnapshot = venueTileBlindSeats(row)
  const actingSeat = venueTileActingSeat(row)
  const seatLastBettingAction = padSeatLastBettingAction(row.seatLastBettingAction)
  const inShowdown = ph === 'showdown'
  const floorShowdownRows = inShowdown ? showdownRowsFromTile(row) : []
  const floorShowdownAnswer = inShowdown
    ? (sharedShowdownAnswer ?? showdownCorrectAnswerFromTile(row))
    : undefined
  const showdownBrief = hideShowdownResults || floorSize.showdownBrief
  /** Mosaic floor never stacks the brown results rail under the felt — overlay or headline only. */
  const mosaicShowdownOverlay =
    inShowdown && floorShowdownRows.length > 0 && (showdownBrief || floorHoneycomb)
  const showExpandedShowdownPanel =
    inShowdown && floorShowdownRows.length > 0 && !showdownBrief && !floorHoneycomb
  const showFloorShowdownOverlay = mosaicShowdownOverlay
  const floorShowdownPresentation = useMemo(() => {
    if (!showFloorShowdownOverlay) return null
    return buildFloorShowdownPresentation(floorShowdownRows, floorShowdownAnswer)
  }, [showFloorShowdownOverlay, floorShowdownRows, floorShowdownAnswer])
  const floorShowdownPot = useMemo(() => {
    if (!showFloorShowdownOverlay) return 0
    return resolveShowdownDisplayPot(row, floorShowdownRows, floorShowdownAnswer)
  }, [showFloorShowdownOverlay, row, floorShowdownRows, floorShowdownAnswer])
  const winnerSeatIndexes = showFloorShowdownOverlay
    ? floorShowdownPresentation?.winnerSeatIndexes ?? null
    : null
  const mosaicPotSubtitle = mosaicPotSubtitleActingToCall({
    actingSeatIndex: actingSeat,
    seatNames,
    actingCallAmount: row.actingCallAmount,
  })
  const toCallFooterLabel = mosaicToCallFooterLabel(row.actingCallAmount)
  const { showNoMoreBets, wageringLive } = mosaicWagerStyleFlags(row, dimAnsweringEarly)
  const denseMosaicChrome =
    floorSize.size === 'medium' || floorSize.size === 'compact' || floorSize.size === 'micro'
  const feltFillsCell = floorHoneycomb && floorSize.honeycombFillHeight && !shrinkWrapRowHeight
  const mosaicShrinkWrap = shrinkWrapRowHeight || !floorSize.honeycombFillHeight
  const showPotSubtitleStrip =
    floorSize.showPotSubtitle && !denseMosaicChrome && mosaicPotSubtitle != null
  const showToCallStrip =
    denseMosaicChrome &&
    !showFloorShowdownOverlay &&
    wageringLive &&
    actingSeat != null &&
    toCallFooterLabel != null
  const potOnFelt = denseMosaicChrome && !showFloorShowdownOverlay
  const potMuted =
    ph === 'lobby' || ph === 'question'
      ? pot > 0
        ? ('dim' as const)
        : ('faint' as const)
      : ('live' as const)
  const actingPlayerName =
    wageringLive && !showFloorShowdownOverlay
      ? mosaicActingPlayerName(actingSeat, seatNames)
      : null

  const cardShell = showNoMoreBets
    ? 'rounded-xl border-2 border-emerald-500/70 bg-black/55 shadow-[0_0_16px_rgba(52,211,153,0.22)] ring-1 ring-emerald-400/20'
    : wageringLive
      ? 'rounded-xl border-2 border-amber-500/70 bg-black/55 shadow-[0_0_22px_rgba(251,191,36,0.28)] ring-1 ring-amber-400/25'
      : 'rounded-xl border-2 border-yellow-700/40 bg-black/55 shadow-lg'

  return (
      <article
        data-table-tile={tn}
        role="group"
        aria-label={`Table ${tn}, pot ${formatVenueBankroll(pot)}${showNoMoreBets ? ', no more bets' : ''}, venue floor`}
        className={`@container relative min-h-0 min-w-0 backdrop-blur-md ${floorSize.tileInsetClass} ${floorSize.cardPaddingClass} ${cardShell} ${
          shrinkWrapRowHeight || mosaicShrinkWrap
            ? 'flex h-auto flex-col'
            : feltFillsCell && showPotSubtitleStrip
              ? 'grid h-full grid-rows-[auto_minmax(0,1fr)_auto]'
              : feltFillsCell
                ? 'grid h-full grid-rows-[auto_minmax(0,1fr)]'
                : 'flex h-full flex-col'
        }`}
      >
        <div
          className={`min-h-0 min-w-0 ${shrinkWrapRowHeight || mosaicShrinkWrap || !feltFillsCell ? `flex flex-col ${floorSize.innerGapClass}` : 'contents'} ${
            showFloorShowdownOverlay ? 'opacity-25' : ''
          }`}
        >
        <div
          className={`grid shrink-0 items-center gap-x-1 ${denseMosaicChrome ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-[auto_minmax(0,1fr)_auto]'} ${floorSize.headerRowClass} ${feltFillsCell ? 'col-start-1 row-start-1 min-w-0' : ''}`}
        >
          {denseMosaicChrome ? (
            <span
              className={`${VENUE_FLOOR_MOSAIC_HEADER_TYPE.tableNumBadge} ${floorSize.tableNumClass}`}
            >
              {tn}
            </span>
          ) : (
            <div
              className={`shrink-0 font-black tabular-nums leading-tight text-yellow-400 ${floorSize.tableNumClass}`}
            >
              {tn}
            </div>
          )}
          {potOnFelt ? (
            <div
              className="min-w-0 px-0.5 text-center"
              aria-label={actingPlayerName ? `${actingPlayerName} to act` : undefined}
            >
              {actingPlayerName ? (
                <span
                  className={`${VENUE_FLOOR_MOSAIC_HEADER_TYPE.actingName} ${
                    wageringLive ? 'motion-safe:animate-pulse motion-safe:[animation-duration:2.4s]' : ''
                  }`}
                  title={actingPlayerName}
                >
                  {actingPlayerName}
                </span>
              ) : null}
            </div>
          ) : !showFloorShowdownOverlay ? (
            <div
              className="min-w-0 px-0.5 text-center"
              aria-label={`Pot ${formatVenueBankroll(pot)}`}
            >
              <VenuePotAmount
                amount={pot}
                prefersReducedMotion={prefersReducedMotion}
                className={`block truncate font-mono font-black tabular-nums leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${floorSize.potClass} ${
                  ph === 'lobby' || ph === 'question'
                    ? pot > 0
                      ? 'text-yellow-300/75'
                      : 'text-yellow-300/40'
                    : 'text-yellow-300'
                }`}
              />
            </div>
          ) : (
            <div className="min-w-0" aria-hidden />
          )}
          {!denseMosaicChrome ? (
            <div className="shrink-0 justify-self-end">
              <span
                className={`inline-block whitespace-nowrap rounded-sm font-semibold leading-tight ${
                  showNoMoreBets ? `${floorSize.phaseChipClass} font-black uppercase` : floorSize.phaseChipClass
                } ${mosaicPhaseCornerTypography(row, showNoMoreBets, wageringLive)} ${mosaicPhaseAccent(row, showNoMoreBets, wageringLive)}`}
              >
                {mosaicPhaseLabel(row, showNoMoreBets, false)}
              </span>
            </div>
          ) : null}
        </div>

        <div
          className={`@container/size relative z-[1] w-full shrink-0 overflow-hidden ${floorSize.ringScaleClass} ${
            feltFillsCell
              ? 'col-start-1 row-start-2 flex min-h-0 flex-1 items-center justify-center'
              : mosaicShrinkWrap
                ? 'shrink-0'
                : 'flex min-h-0 flex-1 items-center justify-center'
          }`}
        >
          <SeatRingWithLabels
            ringMode="mosaic"
            mosaicFluidWidth={floorHoneycomb}
            mosaicDensity={floorSize.size}
            mosaicShrinkWrap={mosaicShrinkWrap}
            mosaicFeltAspectClass={floorSize.feltAspectClass}
            mosaicFeltWidthClass={floorSize.feltWidthClass}
            mosaicCenterPot={potOnFelt ? pot : null}
            mosaicCenterPotClass={VENUE_FLOOR_MOSAIC_HEADER_TYPE.feltPot}
            mosaicCenterPotMuted={potMuted}
            seatedCount={seats}
            seatNames={seatNames}
            seatBankrolls={seatBankrolls}
            blindSeats={blindSeatSnapshot}
            seatFolded={seatFolded}
            actingSeatIndex={actingSeat}
            showSeatBettingActions={false}
            seatLastBettingAction={seatLastBettingAction}
            actingCallAmount={row.actingCallAmount}
            winnerSeatIndexes={showFloorShowdownOverlay ? winnerSeatIndexes : null}
            seatHoleDigits={row.seatHoleDigits}
            communityDigits={row.communityDigits}
            betsInPaused={showNoMoreBets}
            seatSubmittedAnswers={row.seatSubmittedAnswers}
            answeringPhase={ph === 'answering'}
          />
        </div>

        {showToCallStrip ? (
          <p
            className={`shrink-0 text-center ${VENUE_FLOOR_MOSAIC_HEADER_TYPE.toCallStrip} ${
              feltFillsCell ? 'col-start-1 row-start-3 min-w-0' : ''
            }`}
            aria-live="polite"
          >
            To Call:{' '}
            <span className="font-mono font-black tabular-nums text-yellow-300">
              {formatVenueBankroll(Math.max(0, Math.floor(row.actingCallAmount ?? 0)))}
            </span>
          </p>
        ) : null}

        {showPotSubtitleStrip ? (
          <div
            className={`shrink-0 rounded-lg border-2 border-amber-400/50 bg-amber-950/80 shadow-[0_0_14px_rgba(251,191,36,0.18)] ${floorSize.potSubtitleWrapClass} ${
              feltFillsCell ? 'col-start-1 row-start-3 min-w-0' : ''
            }`}
            aria-live="polite"
          >
            <p className={`min-w-0 text-balance text-center ${floorSize.potSubtitleClass}`}>
              {mosaicPotSubtitle}
            </p>
          </div>
        ) : null}

        {showExpandedShowdownPanel ? (
          <div
            className={`rounded-lg p-1 ${feltFillsCell ? 'col-start-1 row-start-3 min-w-0' : ''}`}
            style={{
              background: 'linear-gradient(180deg, #5c3d1e 0%, #3d2810 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.1)',
            }}
          >
            <ShowdownResultsPanel
              compact
              correctAnswer={floorShowdownAnswer}
              rows={floorShowdownRows}
            />
          </div>
        ) : null}
        </div>

        {showFloorShowdownOverlay ? (
          <VenueFloorShowdownByVariant
            tableNum={tn}
            pot={floorShowdownPot}
            rows={floorShowdownRows}
            correctAnswer={floorShowdownAnswer}
          />
        ) : null}

        {showNoMoreBets && seats >= 2 && !showFloorShowdownOverlay ? (
          <VenueMosaicNoMoreBetsWatermark />
        ) : null}
      </article>
  )
}

function venueShowdownQuestionFromTiles(
  tileRows: DisplayVenueTileSnapshot[],
  wallQuestion: string | null
): string | null {
  if (wallQuestion?.trim()) return wallQuestion.trim()
  for (const t of tileRows) {
    if (t.phase === 'showdown') {
      const qt = t.showdownQuestionText
      if (typeof qt === 'string' && qt.trim()) return qt.trim()
    }
  }
  return null
}

function VenueAerialFloorGrid({
  tiles,
  layoutTableCount,
  showHeadline,
  skipMountIntro,
  prefersReducedMotion,
  sharedShowdownAnswer,
}: {
  tiles: DisplayVenueTileSnapshot[]
  /** Size felts for the live table count even when empty felts are hidden from the grid. */
  layoutTableCount: number
  showHeadline: boolean
  skipMountIntro: boolean
  prefersReducedMotion: boolean
  sharedShowdownAnswer?: number
}) {
  const n = tiles.length
  const banquetLayout = useMemo(
    () => venueBanquetLayout(Math.max(n, layoutTableCount)),
    [n, layoutTableCount],
  )
  const { columns, rowCount } = banquetLayout
  const denseTuning = useMemo(
    () => venueFloorDenseTuning(banquetLayout, { withHeadline: showHeadline }),
    [banquetLayout, showHeadline],
  )
  const floorSize = useMemo(
    () => applyVenueFloorDenseTuning(venueFloorSizeSpec(banquetLayout), denseTuning),
    [banquetLayout, denseTuning],
  )
  const floorRowTracks = useMemo(() => venueFloorRowTrackSpec(rowCount), [rowCount])
  const shrinkWrapRowHeight = floorRowTracks.shrinkWrapRowHeight
  const floorGridPadding = useMemo(() => {
    if (denseTuning) {
      return { top: denseTuning.paddingTopRem, bottom: denseTuning.paddingBottomRem }
    }
    return venueFloorGridPaddingRem(rowCount)
  }, [denseTuning, rowCount])
  const floorGridPerspective = useMemo(() => venueFloorGridPerspectiveStyle(rowCount), [rowCount])
  const banquetRows = useMemo(() => chunkTilesIntoBanquetRows(tiles, columns), [tiles, columns])
  const inVenueShowdown = useMemo(() => showdownTableNums(tiles).length > 0, [tiles])
  const showdownBrief =
    floorSize.showdownBrief || rowCount >= 2 || (showHeadline && inVenueShowdown)
  const othersStillWagering = useMemo(() => venueHasOpenWagering(tiles), [tiles])

  if (n === 0) return null

  return (
    <motion.section
      aria-label={`Venue floor — ${n} table${n === 1 ? '' : 's'}, checkerboard half-stagger`}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {!showHeadline ? (
        <div className="mb-1.5 shrink-0 px-1 sm:mb-2">
          <div className="w-[clamp(5rem,min(18vw,8rem),9rem)]">
            <div className="w-full shadow-black/60 drop-shadow-lg" style={{ aspectRatio: '958 / 592' }}>
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 top-[14%] bottom-[5%] opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 45%, rgba(251,191,36,0.28) 0%, transparent 58%),
            repeating-linear-gradient(
              60deg,
              transparent,
              transparent 42px,
              rgba(255,255,255,0.02) 42px,
              rgba(255,255,255,0.02) 43px
            ),
            repeating-linear-gradient(
              -60deg,
              transparent,
              transparent 42px,
              rgba(255,255,255,0.02) 42px,
              rgba(255,255,255,0.02) 43px
            )
          `,
        }}
      />

      <div
        className={`relative grid min-h-0 w-full flex-1 overflow-hidden ${
          denseTuning?.gridInsetClass ?? 'px-4 sm:px-6'
        } ${shrinkWrapRowHeight ? 'content-start items-start' : 'items-stretch content-stretch'}`}
        style={
          {
            gridTemplateRows: floorRowTracks.gridTemplateRows,
            gap: `${floorSize.rowGapRem}rem`,
            paddingTop: `${floorGridPadding.top}rem`,
            paddingBottom: `${floorGridPadding.bottom}rem`,
            ...floorGridPerspective,
          } as CSSProperties
        }
      >
        {banquetRows.map((rowTiles, rowIndex) => {
          const trackCount = banquetCheckerboardTrackCount(columns)

          return (
            <div
              key={rowTiles.map((t) => t.tableNum).join('-') || `row-${rowIndex}`}
              className={`relative grid w-full min-w-0 ${
                shrinkWrapRowHeight ? 'h-auto items-start' : 'h-full min-h-0 items-stretch'
              }`}
              style={{
                gridTemplateColumns: `repeat(${trackCount}, minmax(0, 1fr))`,
                gap: `${floorSize.cellGapRem}rem`,
                zIndex: rowIndex,
              }}
            >
              {Array.from({ length: columns }, (_, colIndex) => {
                const row = rowTiles[colIndex]
                const gridColumn = banquetCheckerboardGridColumn(rowIndex, colIndex)
                if (row == null) {
                  return (
                    <div
                      key={`pad-${rowIndex}-${colIndex}`}
                      className="min-w-0"
                      style={{ gridColumn }}
                      aria-hidden
                    >
                      <div className="w-full" style={{ aspectRatio: '8 / 5' }} />
                    </div>
                  )
                }

                return (
                  <div
                    key={row.tableNum}
                    className={`flex min-w-0 w-full flex-col ${shrinkWrapRowHeight ? 'h-auto' : 'h-full min-h-0'}`}
                    style={{ gridColumn }}
                  >
                    <VenueMosaicTableCard
                      row={row}
                      hideShowdownResults={showdownBrief}
                      floorSize={floorSize}
                      floorHoneycomb
                      shrinkWrapRowHeight={shrinkWrapRowHeight}
                      prefersReducedMotion={prefersReducedMotion}
                      dimAnsweringEarly={row.phase === 'answering' && othersStillWagering}
                      sharedShowdownAnswer={sharedShowdownAnswer}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}

function VenueHeroSpotlightLayout({
  featured,
  companions,
  layoutTableCount,
  skipMountIntro,
  prefersReducedMotion,
  sharedShowdownAnswer,
}: {
  featured: DisplayVenueTileSnapshot
  companions: DisplayVenueTileSnapshot[]
  layoutTableCount: number
  skipMountIntro: boolean
  prefersReducedMotion: boolean
  sharedShowdownAnswer?: number
}) {
  const heroSize = useMemo(() => venueFloorSizeSpec(venueBanquetLayout(1)), [])
  const othersStillWagering = useMemo(() => venueHasOpenWagering(companions), [companions])

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-3">
      <div className="flex min-h-0 min-w-0 flex-col lg:max-h-full">
        <VenueMosaicTableCard
          row={featured}
          hideShowdownResults={false}
          floorSize={heroSize}
          floorHoneycomb
          shrinkWrapRowHeight={false}
          prefersReducedMotion={prefersReducedMotion}
          dimAnsweringEarly={featured.phase === 'answering' && othersStillWagering}
          sharedShowdownAnswer={sharedShowdownAnswer}
        />
      </div>
      {companions.length > 0 ? (
        <VenueAerialFloorGrid
          tiles={companions}
          layoutTableCount={Math.max(companions.length, layoutTableCount - 1)}
          showHeadline={false}
          skipMountIntro={skipMountIntro}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
        />
      ) : null}
    </div>
  )
}

type VenueEightTablesPreviewProps = {
  /** null until first `displayVenueSnapshot` from socket */
  wall: DisplayVenueWallSnapshot | null
  /**
   * Skip Framer entrance on header / headline (brief unmounts across layout transitions should not replay fades).
   */
  skipMountIntro?: boolean
  /** Host-pinned table from `displayLayout.focusTable` — shows spotlight layout only when set. */
  hostFocusTable?: number | null
}

/**
 * Venue wall: A1 checkerboard floor (5×4 half-stagger, uniform tables).
 */
export default function VenueEightTablesPreview({
  wall,
  skipMountIntro = false,
  hostFocusTable = null,
}: VenueEightTablesPreviewProps) {
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [peakSurvivors, setPeakSurvivors] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const headlineQuestionText = wall?.headlineQuestionText ?? null
  const answerDeadlineMs = wall?.answerDeadlineMs ?? null
  const setlistCueNumber = wall?.setlistCueNumber ?? null
  const setlistCueTotal = wall?.setlistCueTotal ?? null
  const showSetlistCue =
    setlistCueNumber != null && setlistCueTotal != null && setlistCueTotal > 0
  const inAnsweringCountdown = answerDeadlineMs != null

  useEffect(() => {
    if (answerDeadlineMs == null) {
      setTimerSeconds(null)
      return
    }
    const tick = () =>
      setTimerSeconds(Math.max(0, Math.ceil((answerDeadlineMs - nowOnServerClock()) / 1000)))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [answerDeadlineMs])

  const tileRows = useMemo(() => buildVenueWallTileRows(wall), [wall])
  const floorTiles = useMemo(() => populatedVenueTiles(tileRows), [tileRows])
  const floorLayoutTableCount = useMemo(() => {
    const live =
      typeof wall?.venueLiveTableCount === 'number' && Number.isFinite(wall.venueLiveTableCount)
        ? Math.floor(wall.venueLiveTableCount)
        : floorTiles.length
    return Math.max(floorTiles.length, live)
  }, [wall?.venueLiveTableCount, floorTiles.length])
  const inVenueShowdown = useMemo(() => showdownTableNums(tileRows).length > 0, [tileRows])
  const venueShowdownAnswer = useMemo(
    () => resolveVenueShowdownAnswer(wall, tileRows),
    [wall, tileRows]
  )
  const headlineShowdownTile = useMemo(() => {
    if (wall?.headlineTableNum != null && Number.isFinite(wall.headlineTableNum)) {
      const n = Math.floor(wall.headlineTableNum)
      return tileRows.find((t) => t.tableNum === n && t.phase === 'showdown') ?? null
    }
    return tileRows.find((t) => t.phase === 'showdown') ?? null
  }, [wall?.headlineTableNum, tileRows])
  const venueShowdownAnswerRow = useMemo(() => {
    if (headlineShowdownTile == null || venueShowdownAnswer == null) return null
    return showdownCorrectAnswerRowFromTile(headlineShowdownTile, venueShowdownAnswer)
  }, [headlineShowdownTile, venueShowdownAnswer])
  const venueShowdownQuestionText = useMemo(
    () => venueShowdownQuestionFromTiles(tileRows, headlineQuestionText),
    [tileRows, headlineQuestionText]
  )

  const hasLiveWall = wall != null && wall.tiles != null && wall.tiles.length > 0
  const headlineSource = useMemo(
    () => resolveVenueHeadlineSource(wall, tileRows),
    [wall, tileRows]
  )
  const headlineAnswering =
    headlineSource.phase === 'answering' || wall?.headlinePhase === 'answering'
  const othersStillWagering = useMemo(() => venueHasOpenWagering(tileRows), [tileRows])
  const showHeadline =
    hasLiveWall &&
    (headlineQuestionText != null || answerDeadlineMs != null || inVenueShowdown || headlineAnswering)
  const headlineQuestionDisplay = inVenueShowdown
    ? venueShowdownQuestionText
    : headlineQuestionText
  const headlineDivergenceNote = useMemo(
    () => venueHeadlineDivergenceNote(tileRows, headlineSource.phase),
    [tileRows, headlineSource.phase]
  )
  const headlinePhaseLabel =
    headlineSource.phase != null ? venueWallPhaseLabel(headlineSource.phase) : null
  const venueBlindsHeadline = useMemo(() => venueWallBlindsHeadline(wall), [wall])
  const condenseHeadline = useMemo(() => venueWallCondenseHeadline(wall), [wall])
  useEffect(() => {
    if (condenseHeadline != null) {
      setPeakSurvivors((prev) => Math.max(prev, condenseHeadline.survivors))
    }
  }, [condenseHeadline])
  const condenseProgress = useMemo(
    () => buildVenueCondenseProgress({ wall, peakSurvivors }),
    [wall, peakSurvivors],
  )
  const showVenueBlindsHeadline =
    venueBlindsHeadline != null &&
    !(inVenueShowdown && venueShowdownAnswer != null) &&
    !headlineAnswering

  const compactVenueHeadline = floorLayoutTableCount >= 14
  const ultraCompactVenueHeadline = floorLayoutTableCount >= 17

  const featuredTile = useMemo(() => {
    if (hostFocusTable == null) return null
    return floorTiles.find((t) => t.tableNum === hostFocusTable) ?? null
  }, [floorTiles, hostFocusTable])

  const companionTiles = useMemo(() => {
    if (hostFocusTable == null) return floorTiles
    return floorTiles.filter((t) => t.tableNum !== hostFocusTable)
  }, [floorTiles, hostFocusTable])

  const showHeroSpotlight = hostFocusTable != null && featuredTile != null
  const sharedShowdownAnswer = inVenueShowdown ? venueShowdownAnswer : undefined

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden text-white"
        style={venueWallUiScaleFrameStyle()}
      >
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(139,69,19,0.25) 2px, transparent 2px),
              linear-gradient(45deg, transparent 47%, rgba(160,82,45,0.12) 50%, transparent 53%)
            `,
            backgroundSize: '48px 48px, 64px 64px',
          }}
        />
      </div>

      <main
        className={`relative z-10 flex min-h-0 flex-1 flex-col px-3 sm:px-4 ${
          compactVenueHeadline ? 'pb-0.5 sm:pb-1' : 'pb-3 sm:pb-4'
        } ${showHeadline ? 'pt-0' : 'pt-[max(0.5rem,env(safe-area-inset-top,0px))]'}`}
      >
        {wall != null && tileRows.length === 0 ? (
          <motion.div
            className="rounded-2xl border border-yellow-700/35 bg-black/55 p-10 text-center shadow-xl backdrop-blur-md sm:p-14"
            initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-4xl font-semibold leading-snug text-white/92 sm:text-5xl md:text-6xl">
              Felts open here after the host assigns players from the lobby.
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-2xl leading-relaxed text-white/65 sm:text-3xl md:text-4xl">
              Guests can keep joining from the briefing screen until seating runs.
            </p>
          </motion.div>
        ) : floorTiles.length > 0 ? (
          <section
            aria-label="Venue floor — all populated tables"
            className={`flex min-h-0 flex-1 flex-col ${compactVenueHeadline ? 'gap-0.5' : 'gap-1.5 sm:gap-2'}`}
          >
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Venue floor
            </p>

            {showHeadline ? (
              <motion.div
                className={`sticky top-0 z-[45] shrink-0 flex w-full min-w-0 flex-col rounded-b-2xl border-2 border-yellow-400/85 bg-black/82 px-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md sm:px-4 md:px-5 ${
                  ultraCompactVenueHeadline
                    ? 'gap-0.5 py-0.5'
                    : compactVenueHeadline
                      ? 'gap-1 py-1 sm:gap-1.5'
                      : 'gap-1.5 py-1.5 sm:gap-2 sm:py-2 md:gap-2.5 md:py-2'
                }`}
                style={{
                  paddingTop: 'max(0.35rem, env(safe-area-inset-top, 0px))',
                }}
                initial={skipMountIntro ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex w-full min-w-0 items-stretch gap-2.5 sm:gap-4 md:gap-5">
                <div
                  className={`pointer-events-none flex shrink-0 items-center self-center ${
                    ultraCompactVenueHeadline
                      ? 'w-[clamp(4.75rem,min(15vw,7rem),8.5rem)]'
                      : compactVenueHeadline
                        ? 'w-[clamp(5.5rem,min(18vw,8rem),10rem)]'
                        : 'w-[clamp(7.5rem,min(24vw,10rem),12.5rem)] sm:w-[clamp(8.25rem,min(28vw,11rem),13.5rem)] md:w-[clamp(9rem,min(26vw,12rem),14.5rem)]'
                  }`}
                >
                  <div
                    className="w-full shadow-black/70 drop-shadow-xl"
                    style={{ aspectRatio: '958 / 592' }}
                  >
                    <QuizzEmWordmark layout="fill" />
                  </div>
                </div>
                <motion.div
                  className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-casino-emerald/35 bg-black/35 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(0,255,180,0.06)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2 md:gap-4 md:px-5"
                  initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="min-w-0 flex-1">
                    {(headlineSource.tableNum != null && headlinePhaseLabel) || showSetlistCue ? (
                      <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {headlineSource.tableNum != null && headlinePhaseLabel ? (
                          <span className={`inline-flex shrink-0 items-center rounded-md border border-yellow-500/45 bg-yellow-950/55 px-1.5 py-px font-black uppercase tracking-wide text-yellow-100/95 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
                            Table {headlineSource.tableNum} · {headlinePhaseLabel}
                          </span>
                        ) : null}
                        {showSetlistCue ? (
                          <span className={`inline-flex shrink-0 items-center rounded-md border border-violet-500/45 bg-violet-950/55 px-1.5 py-px font-black uppercase tracking-wide text-violet-100/95 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
                            Question {setlistCueNumber} of {setlistCueTotal}
                          </span>
                        ) : null}
                        {headlineDivergenceNote ? (
                          <span className={`font-medium text-white/60 ${DISPLAY_TEXT_HEADLINE_META}`}>
                            {headlineDivergenceNote}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {headlineQuestionDisplay ? (
                      <p
                        className={`text-balance text-left font-bold leading-snug tracking-tight text-yellow-400 ${
                          ultraCompactVenueHeadline
                            ? 'text-base sm:text-lg md:text-xl lg:text-[1.55rem]'
                            : compactVenueHeadline
                              ? 'text-lg sm:text-xl md:text-[1.45rem] lg:text-[1.75rem] xl:text-[2rem]'
                              : 'text-xl sm:text-2xl sm:leading-snug md:text-[1.65rem] md:leading-snug lg:text-[2rem] xl:text-[2.35rem] 2xl:text-[2.5rem]'
                        }`}
                      >
                        {headlineQuestionDisplay}
                      </p>
                    ) : inVenueShowdown ? (
                      <p className="sr-only">Showdown in progress.</p>
                    ) : inAnsweringCountdown ? (
                      <p className="text-left text-lg font-bold leading-snug tracking-tight text-cyan-200 sm:text-xl md:text-2xl">
                        Answer on your phone now
                      </p>
                    ) : (
                      <p className="sr-only">Answering in progress.</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2.5">
                    {showVenueBlindsHeadline && venueBlindsHeadline != null ? (
                      <div
                        className="flex shrink-0 flex-col items-center justify-center gap-px rounded-lg border border-amber-500/50 bg-amber-950/40 px-2 py-1 shadow-[0_0_16px_rgba(251,191,36,0.08)] sm:min-w-[6.5rem] sm:px-3 sm:py-1.5"
                        aria-label={
                          venueBlindsHeadline.meta
                            ? `Blinds ${venueBlindsHeadline.amount}, ${venueBlindsHeadline.meta}`
                            : `Blinds ${venueBlindsHeadline.amount}`
                        }
                      >
                        <span className={`text-center font-black uppercase tracking-wide text-amber-200/85 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
                          Blinds
                        </span>
                        <div className="text-center font-mono text-xl font-black tabular-nums tracking-tight text-amber-100 sm:text-3xl md:text-4xl">
                          {venueBlindsHeadline.amount}
                        </div>
                        {venueBlindsHeadline.meta ? (
                          <span className={`max-w-[9rem] text-center font-semibold text-amber-200/70 sm:max-w-[11rem] ${DISPLAY_TEXT_HEADLINE_META}`}>
                            {venueBlindsHeadline.meta}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  {inVenueShowdown && venueShowdownAnswer != null ? (
                    <div
                      className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-amber-400/55 bg-amber-950/45 px-2 py-1.5 shadow-[0_0_20px_rgba(251,191,36,0.1)] sm:min-w-[7rem] sm:px-3 sm:py-2"
                      aria-label={`Correct answer ${formatTriviaNumber(venueShowdownAnswer)}`}
                    >
                      <span className={`font-semibold uppercase tracking-wide text-amber-200/70 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
                        Correct answer
                      </span>
                      {venueShowdownAnswerRow != null && venueShowdownAnswerRow.answerCards.length > 0 ? (
                        <ShowdownFiveCardsUsed row={venueShowdownAnswerRow} size="sm" />
                      ) : (
                        <div className="font-mono text-3xl font-black tracking-tight text-amber-100 sm:text-5xl md:text-6xl xl:text-7xl">
                          {formatTriviaNumber(venueShowdownAnswer)}
                        </div>
                      )}
                    </div>
                  ) : headlineAnswering ? (
                    <div
                      className={`flex shrink-0 flex-col items-stretch justify-center gap-1.5 rounded-lg border px-2 py-1.5 sm:min-w-[7.5rem] sm:px-3 sm:py-2 ${
                        inAnsweringCountdown && typeof timerSeconds === 'number' && timerSeconds <= 10
                          ? 'border-cyan-400/55 bg-cyan-950/45 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                          : 'border-cyan-600/35 bg-cyan-950/25'
                      }`}
                      aria-live="polite"
                      aria-label={
                        inAnsweringCountdown && typeof timerSeconds === 'number'
                          ? `Answer on your phone, ${timerSeconds} seconds remaining`
                          : 'Answer on your phone — timer starts when every table finishes wagering'
                      }
                    >
                      <span className={`text-center font-black uppercase tracking-wide text-cyan-100/90 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
                        Answer on your phone
                      </span>
                      {inAnsweringCountdown && typeof timerSeconds === 'number' ? (
                        <div className="text-center font-mono text-3xl font-black tabular-nums tracking-tight text-cyan-100 sm:text-5xl md:text-6xl xl:text-7xl">
                          {timerSeconds}s
                        </div>
                      ) : othersStillWagering ? (
                        <div className={`text-center font-semibold text-cyan-200/80 ${DISPLAY_TEXT_HEADLINE_META}`}>
                          Waiting for last table
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  </div>
                </motion.div>
                </div>
                {condenseProgress != null && tileRows.length > 0 ? (
                  <VenueCondenseProgressBar model={condenseProgress} variant="headline" />
                ) : null}
              </motion.div>
            ) : null}

            <div className="relative flex min-h-0 flex-1 flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={showHeroSpotlight ? `spotlight-${hostFocusTable}` : 'floor'}
                  className="flex h-full min-h-0 flex-1 flex-col"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  {showHeroSpotlight ? (
                    <VenueHeroSpotlightLayout
                      featured={featuredTile!}
                      companions={companionTiles}
                      layoutTableCount={floorLayoutTableCount}
                      skipMountIntro={skipMountIntro}
                      prefersReducedMotion={prefersReducedMotion}
                      sharedShowdownAnswer={sharedShowdownAnswer}
                    />
                  ) : (
                    <>
                      <div className="flex h-full min-h-0 flex-1 flex-col">
                        <VenueAerialFloorGrid
                          tiles={floorTiles}
                          layoutTableCount={floorLayoutTableCount}
                          showHeadline={showHeadline}
                          skipMountIntro={skipMountIntro}
                          prefersReducedMotion={prefersReducedMotion}
                          sharedShowdownAnswer={sharedShowdownAnswer}
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        ) : tileRows.length > 0 ? (
          <motion.div
            className="rounded-2xl border border-yellow-700/35 bg-black/55 p-8 text-center shadow-xl backdrop-blur-md sm:p-10"
            initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-2xl font-semibold text-white/90 sm:text-3xl">
              Tables are open — waiting for players to sit.
            </p>
          </motion.div>
        ) : null}
      </main>

      {!showHeadline && condenseProgress != null && tileRows.length > 0 ? (
        <VenueCondenseProgressBar model={condenseProgress} variant="bottom" />
      ) : null}
      </div>
    </div>
  )
}
