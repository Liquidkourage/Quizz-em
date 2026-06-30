import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CardFaceGraphic,
  FeltHoleCardPair,
  PokerTableGraphic,
  QuizzEmWordmark,
  SeatCupholderMarker,
  STADIUM_BLIND_BADGE_RADIAL,
  STADIUM_CHIP_STACK_RADIAL,
  STADIUM_CUPHOLDER_RADIAL,
  STADIUM_HOLE_CARDS_RADIAL,
  stadiumCupholderSizePx,
  stadiumHoleCardScale,
  stadiumMosaicCupholderSizePx,
  stadiumMosaicHoleCardScale,
  stadiumMosaicHoleCardWidthPx,
  stadiumMosaicHoleCardHeightPx,
  stadiumMosaicHoleCardOverlapPx,
  stadiumMosaicCommunityCardWidthPx,
  stadiumMosaicCommunityCardHeightPx,
  stadiumSeatPointPx,
  type StadiumMosaicDensity,
} from '@qhe/ui'
import { mosaicSeatDotPct, mosaicSeatHoleLayout, MOSAIC_HOLE_CARD_FAN_DEG } from './venueMosaicSeatGeometry'
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
import { showdownCorrectAnswerFromTile, showdownCorrectAnswerRowFromTile, showdownRowsFromTile, resolveVenueShowdownAnswer } from './showdownDisplay'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import { buildVenueWallTileRows, buildVenueCondenseProgress, resolveVenueHeadlineSource, showdownTableNums, venueAllTablesAnswering, venueHasOpenWagering, venueHeadlineDivergenceNote, venueHeadlinePhaseBadge, venueWallBlindsHeadline, venueWallCondenseHeadline, VENUE_WALL_SEAT_SLOTS } from './venueWallModel'
import { formatVenueBankroll, formatVenueBankrollDigits } from './venueLeaderboard'
import VenueCondenseProgressBar from './VenueCondenseProgressBar'
import VenueHeadlineCondenseStatsPill from './VenueHeadlineCondenseStatsPill'
import {
  DISPLAY_TEXT_HEADLINE_BADGE,
  DISPLAY_TEXT_HEADLINE_META,
  DISPLAY_TEXT_HEADLINE_SETLIST_BADGE,
  DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_LABEL,
  DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_AMOUNT,
  DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_META,
  DISPLAY_TEXT_HEADLINE_PHASE_BADGE,
  DISPLAY_TEXT_HEADLINE_QUESTION_DENSE,
  displayHeadlineStatsClass,
  displayHeadlineQuestionClass,
} from './displayTypography'
import { venueWallUiScaleFrameStyle } from './venueWallUiScale'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'
import {
  chunkTilesIntoRowGroups,
  populatedVenueTiles,
  venueBanquetLayout,
  venueFloorCardSlotWidthCss,
  venueFloorGridPaddingForLayout,
  venueFloorGridInsetClass,
  venueFloorGridPerspectiveStyle,
  venueFloorRowTrackSpec,
  venueFloorSizeSpec,
  venueFloorSpacingSpec,
  VENUE_FLOOR_GRID_BOTTOM_SAFE_REM,
  venueFloorMosaicTypography,
  venueFloorPublicTypographyTier,
  venueMosaicTileTypographyStyle,
  type VenueFloorLayoutViewport,
  type VenueFloorMosaicTypography,
  type VenueFloorSizeSpec,
  type VenueFloorTableSize,
  VENUE_FLOOR_MOSAIC_CHROME,
  VENUE_FLOOR_MOSAIC_HEADER_TYPE,
  VENUE_FLOOR_MOSAIC_FELT_WIDTH_CLASS,
} from './venueFloorGridLayout'
import { capsuleBoundaryHitPx } from './tableRimGeometry'
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

/** Bungee dollar display — raised smaller $, skew, embossed shadow. */
function MosaicBungeeDollarAmount({
  amount,
  className,
  prefersReducedMotion = false,
  pulseOnChange = false,
}: {
  amount: number
  className?: string
  prefersReducedMotion?: boolean
  pulseOnChange?: boolean
}) {
  const label = formatVenueBankroll(amount)
  const digits = formatVenueBankrollDigits(amount)
  const body = (
    <span className="vfd-mosaic-dollar">
      <span className="vfd-mosaic-dollar-sign" aria-hidden>
        $
      </span>
      <span className="vfd-mosaic-dollar-digits">{digits}</span>
    </span>
  )

  if (pulseOnChange && !prefersReducedMotion) {
    return (
      <motion.span
        key={label}
        className={className}
        aria-label={label}
        initial={{ scale: 1.12, opacity: 0.72 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {body}
      </motion.span>
    )
  }

  return (
    <span className={className} aria-label={label}>
      {body}
    </span>
  )
}

function mosaicBungeeDollarColorClass(muted: 'dim' | 'faint' | 'live' | undefined): string {
  if (muted === 'faint') return 'vfd-mosaic-dollar--faint'
  if (muted === 'dim') return 'vfd-mosaic-dollar--dim'
  return 'vfd-mosaic-dollar--live'
}

/** Pot dollars — pulses when the venue snapshot posts a new amount. */
function VenuePotAmount({
  amount,
  className,
  prefersReducedMotion,
  potMuted = 'live',
}: {
  amount: number
  className: string
  prefersReducedMotion: boolean
  potMuted?: 'dim' | 'faint' | 'live'
}) {
  return (
    <MosaicBungeeDollarAmount
      amount={amount}
      className={`${className} ${mosaicBungeeDollarColorClass(potMuted)}`}
      prefersReducedMotion={prefersReducedMotion}
      pulseOnChange
    />
  )
}

type MosaicTableStatusBandKind = 'to-call' | 'no-more-bets' | 'answering'

/** Table status cue — sits between header and felt (to-call, closed betting, answering). */
function MosaicTableStatusBand({
  kind,
  playerName,
  callAmount,
  prefersReducedMotion = false,
  gridRowClass = '',
}: {
  kind: MosaicTableStatusBandKind
  playerName?: string
  callAmount?: number
  prefersReducedMotion?: boolean
  gridRowClass?: string
}) {
  if (kind === 'to-call' && playerName && callAmount != null) {
    const amount = Math.max(0, Math.floor(callAmount))
    return (
      <div
        className={`vfd-mosaic-status-band vfd-mosaic-status-band--call shrink-0 ${gridRowClass}`}
        aria-live="polite"
        aria-label={`${playerName} to call ${formatVenueBankroll(amount)}`}
      >
        <span className="vfd-mosaic-status-band-name" title={playerName}>
          {playerName}
        </span>
        <span className="vfd-mosaic-status-band-label">to call</span>
        <MosaicBungeeDollarAmount
          amount={amount}
          className="vfd-mosaic-status-band-amount vfd-mosaic-dollar--live"
          prefersReducedMotion={prefersReducedMotion}
          pulseOnChange
        />
      </div>
    )
  }

  if (kind === 'no-more-bets') {
    return (
      <div
        className={`vfd-mosaic-status-band vfd-mosaic-status-band--closed shrink-0 ${gridRowClass}`}
        aria-live="polite"
        role="status"
        aria-label="No more bets"
      >
        <span className="vfd-mosaic-status-band-message">No more bets</span>
      </div>
    )
  }

  return (
    <div
      className={`vfd-mosaic-status-band vfd-mosaic-status-band--answering shrink-0 ${gridRowClass}`}
      aria-live="polite"
      role="status"
      aria-label="Answer on your phone"
    >
      <span className="vfd-mosaic-status-band-message">Answer on your phone</span>
    </div>
  )
}

/** Community board and/or pot — centered on mosaic felt. */
function VenueMosaicFeltCenterStack({
  communityDigits,
  communityCardWidthPx,
  communityCardHeightPx,
  pot,
  potClass,
  potMuted,
  prefersReducedMotion,
}: {
  communityDigits: number[]
  communityCardWidthPx: number
  communityCardHeightPx: number
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
          <div
            className="flex items-center justify-center"
            style={{ gap: Math.max(2, Math.round(communityCardWidthPx * 0.07)) }}
          >
            {communityDigits.map((digit, i) => (
              <MosaicDigitCard
                key={`${i}-${digit}`}
                digit={digit}
                widthPx={communityCardWidthPx}
                heightPx={communityCardHeightPx}
              />
            ))}
          </div>
        ) : null}
        {showPot ? (
          <VenuePotAmount
            amount={pot}
            prefersReducedMotion={prefersReducedMotion}
            potMuted={potMuted}
            className={`block truncate ${potClass}`}
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

/** Diagonal stamp when wagering is closed on this felt. */
function VenueMosaicNoMoreBetsWatermark({ offsetClass }: { offsetClass: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center overflow-hidden rounded-xl"
      aria-hidden
    >
      <span
        className={`${VENUE_FLOOR_MOSAIC_HEADER_TYPE.noMoreBetsWatermark} -rotate-12 ${offsetClass} drop-shadow-[0_0_18px_rgba(52,211,153,0.12)]`}
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

/** Community / center board card — fixed px from measured ring (same pattern as hole cards). */
function MosaicDigitCard({
  digit,
  dimmed = false,
  faceDown = false,
  widthPx,
  heightPx,
}: {
  digit?: number
  dimmed?: boolean
  faceDown?: boolean
  widthPx: number
  heightPx: number
}) {
  return (
    <div className="shrink-0" style={{ width: widthPx, height: heightPx }}>
      <CardFaceGraphic
        digit={digit ?? 0}
        faceDown={faceDown}
        dimmed={dimmed}
        className="block h-full w-full"
        alt=""
        aria-hidden
      />
    </div>
  )
}

/** Two fanned face-down hole cards — rail edge pinned, fan opens toward the pot. */
function MosaicHoleCardPair({
  rotateDeg,
  cardWidthPx,
  cardHeightPx,
  overlapPx,
}: {
  rotateDeg: number
  cardWidthPx: number
  cardHeightPx: number
  overlapPx: number
}) {
  const fan = MOSAIC_HOLE_CARD_FAN_DEG
  const cardShell = (fanDeg: number, overlap = 0) => (
    <div
      className="shrink-0"
      style={{
        width: cardWidthPx,
        height: cardHeightPx,
        marginLeft: overlap,
        transformOrigin: '50% 100%',
        transform: fanDeg !== 0 ? `rotate(${fanDeg}deg)` : undefined,
      }}
    >
      <CardFaceGraphic faceDown digit={0} className="block h-full w-full" alt="" aria-hidden />
    </div>
  )

  return (
    <div
      className="pointer-events-none flex items-end justify-center"
      style={{
        transform: `rotate(${rotateDeg}deg)`,
        transformOrigin: '50% 100%',
      }}
      aria-hidden
    >
      {cardShell(fan)}
      {cardShell(-fan, -overlapPx)}
    </div>
  )
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

/** Amber rail — mosaic uses full wrapper; full mode insets slightly. */
const VENUE_RAIL_INSET_TOP = 0.02
const VENUE_RAIL_INSET_RIGHT = 0.02
const VENUE_RAIL_INSET_BOTTOM = 0.02
const VENUE_RAIL_INSET_LEFT = 0.02

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

/** Seat-marker initials on mosaic felts — font size set from cupholder diameter. */
function mosaicSeatInitialsClass(_density: VenueFloorTableSize | undefined): string {
  return VENUE_FLOOR_MOSAIC_HEADER_TYPE.seatInitials
}

/** Initials font size tracks cupholder diameter on mosaic felts. */
function mosaicSeatInitialFontPx(cupSizePx: number): number {
  return Math.max(8, Math.round(cupSizePx * 0.45))
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

/** Cupholder size scales with measured felt width via {@link stadiumCupholderSizePx}. */
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
  seatedCount: _seatedCount,
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
  mosaicFillHeight = false,
  mosaicFeltAspectClass,
  mosaicFeltWidthClass,
  mosaicFeltMaxHeightCss,
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
  mosaicFillHeight?: boolean
  mosaicFeltAspectClass?: string
  mosaicFeltWidthClass?: string
  mosaicFeltMaxHeightCss?: string
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
  const seatFolded = padSeatFolded(seatFoldedIn)
  const seatLastBettingAction = padSeatLastBettingAction(seatLastBettingActionIn)
  const seatHoleDigits = padSeatHoleDigits(seatHoleDigitsIn)
  const seatSubmittedAnswers = padSeatSubmittedAnswers(seatSubmittedAnswersIn)
  const communityDigits =
    communityDigitsIn?.filter((d) => Number.isInteger(d) && d >= 0 && d <= 9) ?? []
  const prefersReducedMotion = usePrefersReducedMotion()
  const isMosaic = ringMode === 'mosaic'
  /** Spotlight hero — wide capsule; mosaic tiles use smaller md ring below. */
  const lgRing =
    'mx-auto aspect-[14/8] h-auto max-h-[min(min(68svh,57dvh),36rem)] w-[min(100%,calc(100dvw-2.5rem),68rem)] max-w-full shrink-0'
  /** Mosaic crawl — stadium capsule; fit cell with width-first sizing so aspect ratio holds. */
  const mdRing = isMosaic
    ? mosaicFluidWidth
      ? mosaicFillHeight
        ? `relative mx-auto aspect-[17/10] h-auto w-full max-h-full max-w-full min-h-0 min-w-0`
        : mosaicShrinkWrap
          ? `relative ${mosaicFeltAspectClass ?? 'aspect-[17/10]'} h-auto shrink-0 ${
              mosaicFeltMaxHeightCss != null
                ? `mx-auto ${mosaicFeltWidthClass ?? 'w-auto max-w-[88%]'}`
                : mosaicFeltWidthClass ?? VENUE_FLOOR_MOSAIC_FELT_WIDTH_CLASS
            }`
          : 'relative mx-auto aspect-[8/5] h-auto w-full max-h-full max-w-full min-h-0 min-w-0'
      : 'relative mx-auto aspect-[8/5] h-[8.75rem] w-full max-w-[16.5rem] shrink-0'
    : 'mx-auto aspect-[13/8] h-auto w-full max-w-[min(100%,22rem)] shrink-0 sm:max-w-[min(100%,23rem)]'
  const wrap = size === 'lg' ? lgRing : mdRing
  const ringWrapStyle =
    isMosaic && mosaicFeltMaxHeightCss != null && !mosaicFillHeight
      ? ({ maxHeight: mosaicFeltMaxHeightCss } as CSSProperties)
      : undefined
  const labelClass =
    size === 'lg'
      ? 'max-w-[min(12rem,34vw)] text-[1.125rem] leading-tight sm:text-[1.3rem] sm:leading-snug md:text-[1.5625rem]'
      : 'max-w-[min(7.125rem,46%)] text-[0.6875rem] leading-tight sm:max-w-[min(7.75rem,48%)] sm:text-xs md:text-sm'

  /** Bankroll stack on felt — stadium radial toward the pot. */
  const chipInnerScale = STADIUM_CHIP_STACK_RADIAL

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
  const mosaicDensityTier = mosaicDensity as StadiumMosaicDensity | undefined
  const cupSizePx = isMosaic
    ? stadiumMosaicCupholderSizePx(rimW, mosaicDensityTier)
    : stadiumCupholderSizePx(rimW)
  const holeCardScale = isMosaic
    ? stadiumMosaicHoleCardScale(rimW, mosaicDensityTier)
    : stadiumHoleCardScale(rimW)
  const mosaicHoleCardW = isMosaic
    ? stadiumMosaicHoleCardWidthPx(rimW, mosaicDensityTier)
    : 0
  const mosaicHoleCardH = isMosaic
    ? stadiumMosaicHoleCardHeightPx(rimW, mosaicDensityTier)
    : 0
  const mosaicHoleCardOverlap = isMosaic
    ? stadiumMosaicHoleCardOverlapPx(mosaicHoleCardW)
    : 0
  const mosaicCommunityCardW = isMosaic
    ? stadiumMosaicCommunityCardWidthPx(rimW, mosaicDensityTier)
    : 0
  const mosaicCommunityCardH = isMosaic
    ? stadiumMosaicCommunityCardHeightPx(rimW, mosaicDensityTier)
    : 0
  /** Physical seat slots (0–7) — always distribute around the full eight-seat stadium. */
  const seatCountForLayout = VENUE_SEAT_SLOTS

  const showFeltBoardCenter =
    isMosaic && (communityDigits.length > 0 || mosaicCenterPot != null)

  const layoutReady = rimW > 0 && rimH > 0

  return (
    <div ref={ringElRef} className={`@container relative ${isMosaic ? 'overflow-hidden' : 'overflow-visible'} ${wrap}`} style={ringWrapStyle}>
      <div className="absolute inset-0" aria-hidden>
        <PokerTableGraphic
          className={`h-full w-full drop-shadow-md ${
            isMosaic && betsInPaused ? 'brightness-[0.72] saturate-[0.45]' : ''
          }`}
        />
      </div>
      {isMosaic && betsInPaused ? (
        <div
          className="pointer-events-none absolute inset-0 z-[11] bg-emerald-500/12"
          aria-hidden
        />
      ) : null}
      {showFeltBoardCenter ? (
        <VenueMosaicFeltCenterStack
          communityDigits={communityDigits}
          communityCardWidthPx={mosaicCommunityCardW}
          communityCardHeightPx={mosaicCommunityCardH}
          pot={mosaicCenterPot}
          potClass={mosaicCenterPotClass}
          potMuted={mosaicCenterPotMuted}
          prefersReducedMotion={prefersReducedMotion}
        />
      ) : null}
      {layoutReady &&
        Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
        const raw = seatNames[i]?.trim() ?? ''
        const filled = raw.length > 0
        if (isMosaic && !filled) return null

        const seatRimPt = isMosaic
          ? mosaicSeatDotPct(i, seatCountForLayout, rimW, rimH)
          : (() => {
              const pt = stadiumSeatPointPx(
                i,
                seatCountForLayout,
                rimW,
                rimH,
                STADIUM_CUPHOLDER_RADIAL
              )
              return { leftPct: pt.leftPct, topPct: pt.topPct }
            })()
        const chipPt = isMosaic
          ? mosaicSeatHoleLayout(i, seatCountForLayout, rimW, rimH, 0.28)
          : stadiumSeatPointPx(i, seatCountForLayout, rimW, rimH, chipInnerScale)
        const chipPos = { leftPct: chipPt.leftPct, topPct: chipPt.topPct }
        const holeLayout = isMosaic
          ? mosaicSeatHoleLayout(i, seatCountForLayout, rimW, rimH)
          : (() => {
              const pt = stadiumSeatPointPx(
                i,
                seatCountForLayout,
                rimW,
                rimH,
                STADIUM_HOLE_CARDS_RADIAL
              )
              return {
                leftPct: pt.leftPct,
                topPct: pt.topPct,
                rotateDeg: pt.rotateDeg,
              }
            })()
        const anchored = labelAnchorsPct[i]
        const fb = fallbackLabelEllipseScale(size, Boolean(feltSeatStacks && size === 'lg'))
        const fallbackPos = venueSeatRimPct(i, fb, rimW, rimH)
        const labelPos = anchored ?? fallbackPos
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
        const actingSoftPulse =
          'pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/12 motion-reduce:hidden motion-safe:animate-pulse'
        return (
          <div key={i}>
            <div
              className={`absolute flex items-center justify-center ${SEAT_LAYER_DOT}`}
              style={{
                left: `${seatRimPt.leftPct}%`,
                top: `${seatRimPt.topPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {isActing && !prefersReducedMotion ? (
                <span
                  aria-hidden
                  className={`${actingSoftPulse} motion-safe:[animation-duration:2.8s]`}
                  style={{ width: cupSizePx * 1.15, height: cupSizePx * 1.15 }}
                />
              ) : answerLocked && !prefersReducedMotion ? (
                <span
                  aria-hidden
                  className={`${actingSoftPulse} bg-cyan-400/20 motion-safe:[animation-duration:2.2s]`}
                  style={{ width: cupSizePx * 1.15, height: cupSizePx * 1.15 }}
                />
              ) : isWinner && !prefersReducedMotion ? (
                <span
                  aria-hidden
                  className={`${actingSoftPulse} bg-amber-400/18 motion-safe:[animation-duration:3.2s]`}
                  style={{ width: cupSizePx * 1.15, height: cupSizePx * 1.15 }}
                />
              ) : null}
              <SeatCupholderMarker
                sizePx={cupSizePx}
                label={isMosaic && filled && mosaicInitials ? mosaicInitials : undefined}
                labelClassName={mosaicSeatInitialsClass(mosaicDensity)}
                labelFontSizePx={isMosaic ? mosaicSeatInitialFontPx(cupSizePx) : undefined}
                state={
                  isFolded
                    ? 'folded'
                    : isActing
                      ? 'acting'
                      : answerLocked
                        ? 'answerLocked'
                        : isWinner
                          ? 'winner'
                          : 'default'
                }
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
              />
            </div>
            {filled && !isFolded && seatHoleDigits[i] != null ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_FELT_HOLE}`}
                style={{
                  left: `${holeLayout.leftPct}%`,
                  top: `${holeLayout.topPct}%`,
                  transform: isMosaic ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)',
                }}
                aria-label="Two hole cards"
              >
                {isMosaic ? (
                  <MosaicHoleCardPair
                    rotateDeg={holeLayout.rotateDeg}
                    cardWidthPx={mosaicHoleCardW}
                    cardHeightPx={mosaicHoleCardH}
                    overlapPx={mosaicHoleCardOverlap}
                  />
                ) : (
                  <FeltHoleCardPair
                    rotateDeg={holeLayout.rotateDeg}
                    scale={holeCardScale}
                    faceDown
                    digits={seatHoleDigits[i]}
                  />
                )}
              </div>
            ) : null}
            {isMosaic ? null : (() => {
              if (blindSeats == null) return null
              const tags = blindTagsForSeat(i, blindSeats)
              if (tags.length === 0) return null
              const blindPt = stadiumSeatPointPx(
                i,
                seatCountForLayout,
                rimW,
                rimH,
                STADIUM_BLIND_BADGE_RADIAL
              )
              const badgeText =
                size === 'lg'
                  ? 'text-[8px] font-black leading-none tracking-tight sm:text-[9px]'
                  : 'text-[7px] font-black leading-none tracking-tight sm:text-[8px]'
              return (
                <div
                  className={`pointer-events-none absolute ${SEAT_LAYER_BLIND_OUT} flex flex-col items-center gap-px`}
                  style={{
                    left: `${blindPt.leftPct}%`,
                    top: `${blindPt.topPct}%`,
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
                  left: `${chipPt.leftPct}%`,
                  top: `${chipPt.topPct}%`,
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
  /** Fill-height grid — stretch card and felt to the row slot. */
  floorFillHeight?: boolean
  /** Single-row floor — card height follows felt content, not viewport. */
  shrinkWrapRowHeight?: boolean
  prefersReducedMotion?: boolean
  /** Slightly dim answering tiles while other felts are still in open wagering. */
  dimAnsweringEarly?: boolean
  /** Venue-wide authoritative answer — overrides per-tile `showdownAnswer` when set. */
  sharedShowdownAnswer?: number
  /** Table-count-aware mosaic typography from {@link venueFloorMosaicTypography}. */
  mosaicTypography: VenueFloorMosaicTypography
  /** Active table count — drives per-tile typography tier. */
  layoutTableCount: number
}

function VenueMosaicTableCard({
  row,
  hideShowdownResults = false,
  floorSize,
  floorHoneycomb = false,
  floorFillHeight = false,
  shrinkWrapRowHeight = false,
  prefersReducedMotion = false,
  dimAnsweringEarly = false,
  sharedShowdownAnswer,
  mosaicTypography,
  layoutTableCount,
}: VenueMosaicTableCardProps) {
  const tileRef = useRef<HTMLElement>(null)
  const [tilePx, setTilePx] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = tileRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const apply = () => {
      const r = el.getBoundingClientRect()
      const ww = r.width
      const hh = r.height
      if (ww > 0 && hh > 0)
        setTilePx((prev) => (prev.w === ww && prev.h === hh ? prev : { w: ww, h: hh }))
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const tileTypographyStyle = useMemo(
    () =>
      venueMosaicTileTypographyStyle(
        venueFloorPublicTypographyTier(layoutTableCount),
        tilePx.w,
        floorSize.size
      ),
    [layoutTableCount, tilePx.w, floorSize.size]
  )
  const tn = row.tableNum
  const seats = row.seated
  const pot = Math.max(0, Math.floor(Number.isFinite(row.pot) ? row.pot : 0))
  const ph = String(row.phase ?? '').trim().toLowerCase()
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
  const { showNoMoreBets, wageringLive } = mosaicWagerStyleFlags(row, dimAnsweringEarly)
  /** Unified mosaic card chrome (badge, acting name, pot-on-felt) for dense grids only. */
  const spaciousTileChrome =
    floorSize.size === 'hero' ||
    (layoutTableCount <= 8 && floorSize.size === 'large')
  const denseMosaicChrome = !spaciousTileChrome
  const feltFillsCell =
    floorFillHeight || (floorHoneycomb && floorSize.honeycombFillHeight && !shrinkWrapRowHeight)
  const mosaicShrinkWrap =
    !floorFillHeight && (shrinkWrapRowHeight || !floorSize.honeycombFillHeight)
  const actingPlayerName =
    wageringLive && !showFloorShowdownOverlay
      ? mosaicActingPlayerName(actingSeat, seatNames)
      : null
  const actingCallAmount =
    row.actingCallAmount != null &&
    typeof row.actingCallAmount === 'number' &&
    Number.isFinite(row.actingCallAmount)
      ? Math.max(0, Math.floor(row.actingCallAmount))
      : null
  const statusBandKind = ((): MosaicTableStatusBandKind | null => {
    if (showFloorShowdownOverlay) return null
    if (
      wageringLive &&
      actingSeat != null &&
      actingPlayerName != null &&
      actingCallAmount != null
    ) {
      return 'to-call'
    }
    if (showNoMoreBets && seats >= 2) return 'no-more-bets'
    if (ph === 'answering' && seats >= 2) return 'answering'
    return null
  })()
  const showStatusBand = statusBandKind != null
  /** Status band + venue headline cover these — never duplicate as a header corner chip. */
  const suppressCornerPhaseChip =
    showNoMoreBets || ph === 'answering' || (wageringLive && ph === 'betting')
  const showHeaderPhaseChip =
    !denseMosaicChrome && !showFloorShowdownOverlay && !suppressCornerPhaseChip
  const potOnFelt = denseMosaicChrome && !showFloorShowdownOverlay
  const potMuted =
    ph === 'lobby' || ph === 'question'
      ? pot > 0
        ? ('dim' as const)
        : ('faint' as const)
      : ('live' as const)
  const feltGridRow = showStatusBand ? 'col-start-1 row-start-3' : 'col-start-1 row-start-2'
  const statusBandGridRow = 'col-start-1 row-start-2 min-w-0'
  const showdownPanelGridRow = showStatusBand ? 'col-start-1 row-start-4' : 'col-start-1 row-start-3'

  const cardShell = showNoMoreBets
    ? 'rounded-xl border-2 border-emerald-500/70 bg-black/55 shadow-[0_0_16px_rgba(52,211,153,0.22)] ring-1 ring-emerald-400/20'
    : ph === 'answering'
      ? 'rounded-xl border-2 border-cyan-500/55 bg-black/55 shadow-[0_0_18px_rgba(34,211,238,0.18)] ring-1 ring-cyan-400/20'
      : wageringLive
        ? 'rounded-xl border-2 border-amber-500/70 bg-black/55 shadow-[0_0_22px_rgba(251,191,36,0.28)] ring-1 ring-amber-400/25'
        : 'rounded-xl border-2 border-yellow-700/40 bg-black/55 shadow-lg'

  const statusBandAria =
    statusBandKind === 'to-call' && actingPlayerName && actingCallAmount != null
      ? `, ${actingPlayerName} to call ${formatVenueBankroll(actingCallAmount)}`
      : statusBandKind === 'no-more-bets'
        ? ', no more bets'
        : statusBandKind === 'answering'
          ? ', answer on your phone'
          : ''

  return (
      <article
        ref={tileRef}
        data-table-tile={tn}
        role="group"
        aria-label={`Table ${tn}, pot ${formatVenueBankroll(pot)}${statusBandAria}, venue floor`}
        style={tileTypographyStyle}
        className={`@container/size relative min-h-0 min-w-0 ${mosaicTypography.rootClass} ${showFloorShowdownOverlay ? 'vfd-mosaic-tile--showdown-overlay' : 'backdrop-blur-md'} ${floorSize.tileInsetClass} ${floorSize.cardPaddingClass} ${cardShell} ${
          showFloorShowdownOverlay && shrinkWrapRowHeight
            ? 'vfd-mosaic-tile--showdown-aspect flex w-full flex-col'
            : floorFillHeight
            ? 'flex h-full min-h-0 w-full flex-col'
            : shrinkWrapRowHeight || mosaicShrinkWrap
              ? 'flex h-auto flex-col'
              : feltFillsCell && showStatusBand
                ? 'grid h-full grid-rows-[auto_auto_minmax(0,1fr)]'
                : feltFillsCell
                  ? 'grid h-full grid-rows-[auto_minmax(0,1fr)]'
                  : 'flex h-full flex-col'
        }`}
      >
        <div
          className={`min-h-0 min-w-0 ${
            floorFillHeight
              ? 'flex min-h-0 flex-1 flex-col'
              : shrinkWrapRowHeight || mosaicShrinkWrap || !feltFillsCell
                ? `flex flex-col ${floorSize.innerGapClass}`
                : 'contents'
          } ${showFloorShowdownOverlay ? 'hidden' : ''}`}
        >
        <div
          className={`grid shrink-0 gap-x-1 ${
            denseMosaicChrome
              ? 'grid-cols-[auto_minmax(0,1fr)]'
              : showHeaderPhaseChip
                ? 'grid-cols-[auto_minmax(0,1fr)_auto]'
                : 'grid-cols-[auto_minmax(0,1fr)]'
          } ${floorSize.headerRowClass} ${denseMosaicChrome ? mosaicTypography.titleRowClass : ''} ${feltFillsCell ? 'col-start-1 row-start-1 min-w-0' : ''}`}
        >
          {denseMosaicChrome ? (
            <span
              className={`${VENUE_FLOOR_MOSAIC_CHROME.tableNumBadge} ${mosaicTypography.tableNum}`}
            >
              {tn}
            </span>
          ) : (
            <div
              className={`shrink-0 tabular-nums leading-tight text-yellow-400 ${floorSize.tableNumClass} ${mosaicTypography.tableNum}`}
            >
              {tn}
            </div>
          )}
          {potOnFelt ? (
            <div
              className="min-w-0 px-0.5 text-center"
              aria-label={actingPlayerName && !showStatusBand ? `${actingPlayerName} to act` : undefined}
            >
              {actingPlayerName && !showStatusBand ? (
                <span className={mosaicTypography.actingName} title={actingPlayerName}>
                  {actingPlayerName}
                </span>
              ) : denseMosaicChrome ? (
                <span className={`${mosaicTypography.actingName} invisible`} aria-hidden>
                  {'\u00A0'}
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
                potMuted={
                  ph === 'lobby' || ph === 'question'
                    ? pot > 0
                      ? 'dim'
                      : 'faint'
                    : 'live'
                }
                className={`block truncate ${floorSize.potClass} ${mosaicTypography.feltPot}`}
              />
            </div>
          ) : (
            <div className="min-w-0" aria-hidden />
          )}
          {showHeaderPhaseChip ? (
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

        {statusBandKind != null ? (
          <MosaicTableStatusBand
            kind={statusBandKind}
            playerName={actingPlayerName ?? undefined}
            callAmount={actingCallAmount ?? undefined}
            prefersReducedMotion={prefersReducedMotion}
            gridRowClass={feltFillsCell ? statusBandGridRow : ''}
          />
        ) : null}

        <div
          className={`@container/size relative z-[1] w-full overflow-hidden ${floorSize.ringScaleClass} ${
            floorFillHeight && denseMosaicChrome ? mosaicTypography.feltMaxHeightClass : ''
          } ${
            floorFillHeight
              ? 'flex min-h-0 flex-1 items-center justify-center'
              : feltFillsCell
                ? `${feltGridRow} flex min-h-0 flex-1 items-center justify-center`
                : mosaicShrinkWrap
                  ? 'shrink-0'
                  : 'flex min-h-0 flex-1 items-center justify-center'
          }`}
        >
          <SeatRingWithLabels
            ringMode="mosaic"
            mosaicFluidWidth={floorHoneycomb || floorFillHeight}
            mosaicDensity={floorSize.size}
            mosaicShrinkWrap={mosaicShrinkWrap}
            mosaicFillHeight={floorFillHeight}
            mosaicFeltAspectClass={floorSize.feltAspectClass}
            mosaicFeltWidthClass={floorSize.feltWidthClass}
            mosaicCenterPot={potOnFelt ? pot : null}
            mosaicCenterPotClass={mosaicTypography.feltPot}
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

        {showExpandedShowdownPanel ? (
          <div
            className={`rounded-lg p-1 ${feltFillsCell ? showdownPanelGridRow + ' min-w-0' : ''}`}
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
            layoutTableCount={layoutTableCount}
          />
        ) : null}

        {showNoMoreBets && seats >= 2 && !showFloorShowdownOverlay && statusBandKind !== 'no-more-bets' ? (
          <VenueMosaicNoMoreBetsWatermark offsetClass={mosaicTypography.noMoreBetsOffsetClass} />
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
  const layoutCount = n > 0 ? n : layoutTableCount
  const floorHostRef = useRef<HTMLDivElement>(null)
  const [floorViewport, setFloorViewport] = useState<VenueFloorLayoutViewport | undefined>()

  useLayoutEffect(() => {
    const host = floorHostRef.current
    if (!host || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      const widthPx = host.clientWidth
      const heightPx = host.clientHeight
      if (widthPx <= 0 || heightPx <= 0) return
      setFloorViewport((prev) =>
        prev?.widthPx === widthPx && prev.heightPx === heightPx
          ? prev
          : { widthPx, heightPx }
      )
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  const floorLayout = useMemo(
    () =>
      venueBanquetLayout(layoutCount, {
        viewport: floorViewport,
        withHeadline: showHeadline,
      }),
    [layoutCount, floorViewport, showHeadline]
  )
  const { rowCount, rowSizes, columns: floorColumns } = floorLayout
  const floorSize = useMemo(
    () => venueFloorSpacingSpec(layoutCount, floorLayout, { withHeadline: showHeadline }),
    [layoutCount, floorLayout, showHeadline]
  )
  const { fillRowHeight, shrinkWrapRowHeight } = venueFloorRowTrackSpec(rowCount, {
    withHeadline: showHeadline,
  })
  const floorGridPadding = useMemo(
    () => venueFloorGridPaddingForLayout(rowCount, { withHeadline: showHeadline }),
    [rowCount, showHeadline]
  )
  const gridInsetClass =
    venueFloorGridInsetClass(rowCount, { withHeadline: showHeadline }) ?? 'px-4 sm:px-6'
  const inVenueShowdown = useMemo(() => showdownTableNums(tiles).length > 0, [tiles])
  /** 3D floor tilt softens raster art — stay flat while winner overlays are up. */
  const floorGridPerspective = useMemo(
    () => (inVenueShowdown ? {} : venueFloorGridPerspectiveStyle(rowCount)),
    [rowCount, inVenueShowdown]
  )
  const floorRows = useMemo(() => chunkTilesIntoRowGroups(tiles, rowSizes), [tiles, rowSizes])
  const mosaicTypography = useMemo(() => venueFloorMosaicTypography(layoutCount), [layoutCount])
  const cardSlotWidthForRow = useCallback(
    () => venueFloorCardSlotWidthCss(floorColumns, floorSize.cellGapRem),
    [floorColumns, floorSize.cellGapRem]
  )
  const showdownBrief =
    floorSize.showdownBrief || rowCount >= 2 || (showHeadline && inVenueShowdown)
  const othersStillWagering = useMemo(() => venueHasOpenWagering(tiles), [tiles])

  if (n === 0) return null

  return (
    <motion.section
      aria-label={`Venue floor — ${n} table${n === 1 ? '' : 's'}, staggered row grid`}
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
        ref={floorHostRef}
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${gridInsetClass}`}
        style={
          {
            paddingTop: `${floorGridPadding.top}rem`,
            paddingBottom: `max(${floorGridPadding.bottom}rem, calc(${VENUE_FLOOR_GRID_BOTTOM_SAFE_REM}rem + env(safe-area-inset-bottom, 0px)))`,
            ...floorGridPerspective,
          } as CSSProperties
        }
      >
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{ gap: `${floorSize.rowGapRem}rem` }}
        >
          {floorRows.map((rowTiles, rowIndex) => (
            <div
              key={rowTiles.map((t) => t.tableNum).join('-') || `row-${rowIndex}`}
              className={`flex min-h-0 w-full items-stretch justify-center ${
                fillRowHeight ? 'flex-1' : 'flex-none'
              }`}
              style={{ gap: `${floorSize.cellGapRem}rem` }}
            >
              {rowTiles.map((row) => {
                const rowSlotWidth = cardSlotWidthForRow()
                return (
                <div
                  key={row.tableNum}
                  className={`flex min-h-0 min-w-0 flex-col ${fillRowHeight ? 'h-full' : 'h-auto'}`}
                  style={{ flex: `0 0 ${rowSlotWidth}`, maxWidth: rowSlotWidth }}
                >
                  <VenueMosaicTableCard
                    row={row}
                    hideShowdownResults={showdownBrief}
                    floorSize={floorSize}
                    floorHoneycomb
                    floorFillHeight={fillRowHeight}
                    shrinkWrapRowHeight={shrinkWrapRowHeight}
                    prefersReducedMotion={prefersReducedMotion}
                    dimAnsweringEarly={row.phase === 'answering' && othersStillWagering}
                    sharedShowdownAnswer={sharedShowdownAnswer}
                    mosaicTypography={mosaicTypography}
                    layoutTableCount={layoutCount}
                  />
                </div>
              )})}
            </div>
          ))}
        </div>
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
  const heroSize = useMemo(() => venueFloorSizeSpec(1), [])
  const heroTypography = useMemo(() => venueFloorMosaicTypography(1), [])
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
          mosaicTypography={heroTypography}
          layoutTableCount={layoutTableCount}
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
 * Venue wall: count-aware responsive table grid beneath the headline strip.
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
    return showdownCorrectAnswerRowFromTile(
      headlineShowdownTile,
      venueShowdownAnswer,
      wall?.headlineAnswerComposition ?? null
    )
  }, [headlineShowdownTile, venueShowdownAnswer, wall?.headlineAnswerComposition])
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
  const allTablesAnswering = useMemo(() => venueAllTablesAnswering(tileRows), [tileRows])
  /** Every populated table is answering — strip blinds/phase chrome; show countdown only. */
  const headlineAnsweringUnified =
    headlineAnswering && allTablesAnswering && !othersStillWagering
  const headlineTimerOnly =
    headlineAnsweringUnified &&
    inAnsweringCountdown &&
    typeof timerSeconds === 'number'
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
  const headlinePhaseBadge = useMemo(
    () =>
      venueHeadlinePhaseBadge(
        tileRows,
        headlineSource.phase ?? wall?.headlinePhase ?? null,
        inVenueShowdown,
      ),
    [tileRows, headlineSource.phase, wall?.headlinePhase, inVenueShowdown],
  )
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
    venueBlindsHeadline != null && !(inVenueShowdown && venueShowdownAnswer != null)

  const compactVenueHeadline = floorLayoutTableCount >= 14
  const ultraCompactVenueHeadline = floorLayoutTableCount >= 17
  const publicTypographyTier = useMemo(
    () => venueFloorPublicTypographyTier(floorLayoutTableCount),
    [floorLayoutTableCount],
  )
  const headlineQuestionClass = useMemo(() => {
    if (compactVenueHeadline) return DISPLAY_TEXT_HEADLINE_QUESTION_DENSE
    return displayHeadlineQuestionClass(publicTypographyTier)
  }, [compactVenueHeadline, publicTypographyTier])
  const headlineStatsClass = useMemo(
    () => displayHeadlineStatsClass(compactVenueHeadline),
    [compactVenueHeadline],
  )
  const headlineLogoWidthClass = ultraCompactVenueHeadline
    ? 'w-[clamp(6.5rem,min(18vw,9rem),11rem)]'
    : compactVenueHeadline
      ? 'w-[clamp(7.5rem,min(20vw,10.5rem),12.5rem)]'
      : 'w-[clamp(8.5rem,min(22vw,12rem),15rem)] sm:w-[clamp(9.5rem,min(24vw,13rem),16.5rem)]'
  const headlineQuestionCardPadClass = compactVenueHeadline
    ? 'px-2 py-1 sm:px-2.5 sm:py-1.5'
    : 'px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4'
  const venueTypographyRootClass = useMemo(
    () => venueFloorMosaicTypography(floorLayoutTableCount).rootClass,
    [floorLayoutTableCount],
  )

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
    <div className="fixed inset-0 overflow-hidden bg-[#050806]">
      <DisplayWelcomeBackdrop />
      <div
        className={`relative z-10 flex h-full min-h-0 flex-col overflow-hidden text-white ${venueTypographyRootClass}`}
        style={venueWallUiScaleFrameStyle()}
      >

      <main
        className={`relative z-10 flex min-h-0 flex-1 flex-col px-3 sm:px-4 ${
          compactVenueHeadline ? 'pb-0.5 sm:pb-1' : 'pb-3 sm:pb-4'
        } ${showHeadline ? 'pt-0' : 'pt-[max(0.5rem,env(safe-area-inset-top,0px))]'}`}
      >
        {floorTiles.length > 0 ? (
          <section
            aria-label="Venue floor — all populated tables"
            className={`flex min-h-0 flex-1 flex-col ${compactVenueHeadline ? 'gap-0' : 'gap-1.5 sm:gap-2'}`}
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
                <div className="flex w-full min-w-0 items-stretch gap-2 sm:gap-3 md:gap-4">
                <div
                  className={`pointer-events-none flex shrink-0 items-center self-center ${headlineLogoWidthClass}`}
                >
                  <div
                    className="w-full shadow-black/70 drop-shadow-xl"
                    style={{ aspectRatio: '958 / 592' }}
                  >
                    <QuizzEmWordmark layout="fill" />
                  </div>
                </div>
                <motion.div
                  className={`venue-headline-question-card flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl border border-casino-emerald/35 bg-black/35 shadow-[inset_0_0_0_1px_rgba(0,255,180,0.06)] backdrop-blur-md ${headlineQuestionCardPadClass}`}
                  initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {showSetlistCue || condenseProgress != null || headlineDivergenceNote ? (
                    <div className="flex min-w-0 items-start justify-between gap-x-2 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        {showSetlistCue ? (
                          <span className={`inline-flex shrink-0 items-center rounded-md border border-violet-500/45 bg-violet-950/55 px-2 py-0.5 font-black uppercase tracking-wide text-violet-100/95 sm:px-2.5 sm:py-1 ${DISPLAY_TEXT_HEADLINE_SETLIST_BADGE}`}>
                            Question {setlistCueNumber} of {setlistCueTotal}
                          </span>
                        ) : null}
                        {headlineDivergenceNote ? (
                          <span className={`font-semibold text-white/65 ${DISPLAY_TEXT_HEADLINE_META}`}>
                            {headlineDivergenceNote}
                          </span>
                        ) : null}
                      </div>
                      {condenseProgress != null ? (
                        <VenueHeadlineCondenseStatsPill
                          model={condenseProgress}
                          className={`ml-auto shrink-0 ${headlineStatsClass}`}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {headlineQuestionDisplay ? (
                    <p
                      className={`venue-headline-question-slot min-h-0 min-w-0 flex-1 text-balance text-center tracking-tight text-yellow-400 ${headlineQuestionClass}`}
                    >
                      {headlineQuestionDisplay}
                    </p>
                  ) : inVenueShowdown ? (
                    <p className="sr-only">Showdown in progress.</p>
                  ) : inAnsweringCountdown ? (
                    <p className="text-left text-lg font-bold leading-snug tracking-tight text-cyan-200 sm:text-xl">
                      Answer on your phone now
                    </p>
                  ) : (
                    <p className="sr-only">Answering in progress.</p>
                  )}
                </motion.div>
                <div
                  className={`flex shrink-0 flex-col justify-center ${
                    headlineAnsweringUnified
                      ? 'items-end'
                      : 'items-stretch gap-1.5 sm:min-w-[8.5rem] md:min-w-[10rem] lg:min-w-[11rem]'
                  }`}
                >
                  {headlinePhaseBadge != null && !inVenueShowdown && !headlineAnsweringUnified ? (
                    <span
                      className={`inline-flex items-center justify-center rounded-lg border border-emerald-500/45 bg-emerald-950/50 px-2.5 py-1 text-center font-black uppercase tracking-wide text-emerald-100/95 sm:px-3 sm:py-1.5 ${DISPLAY_TEXT_HEADLINE_PHASE_BADGE}`}
                    >
                      {headlinePhaseBadge}
                    </span>
                  ) : null}
                  {showVenueBlindsHeadline && venueBlindsHeadline != null && !headlineAnsweringUnified ? (
                    <div
                      className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-amber-500/55 bg-amber-950/50 px-3 py-2 shadow-[0_0_20px_rgba(251,191,36,0.12)] sm:px-4 sm:py-2.5"
                      aria-label={
                        venueBlindsHeadline.meta
                          ? `Blinds ${venueBlindsHeadline.amount}, ${venueBlindsHeadline.meta}`
                          : `Blinds ${venueBlindsHeadline.amount}`
                      }
                    >
                      <span className={`text-center font-black uppercase tracking-wide text-amber-200/90 ${DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_LABEL}`}>
                        Blinds
                      </span>
                      <div className={`text-center font-mono font-black tabular-nums tracking-tight text-amber-50 ${DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_AMOUNT}`}>
                        {venueBlindsHeadline.amount}
                      </div>
                      {venueBlindsHeadline.meta ? (
                        <div className="flex max-w-[11rem] flex-col items-center gap-0.5 text-center">
                          {venueBlindsHeadline.meta.split(' · ').map((line) => (
                            <span
                              key={line}
                              className={`font-semibold text-amber-200/75 ${DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_META}`}
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {inVenueShowdown && venueShowdownAnswer != null ? (
                    <div
                      className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-amber-400/55 bg-amber-950/45 px-2 py-1.5 shadow-[0_0_20px_rgba(251,191,36,0.1)] sm:px-3 sm:py-2"
                      aria-label={`Correct answer ${formatTriviaNumber(venueShowdownAnswer)}`}
                    >
                      <span className={`font-semibold uppercase tracking-wide text-amber-200/70 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
                        Correct answer
                      </span>
                      {venueShowdownAnswerRow != null && venueShowdownAnswerRow.answerCards.length > 0 ? (
                        <ShowdownFiveCardsUsed row={venueShowdownAnswerRow} size="sm" />
                      ) : (
                        <div className="font-mono text-2xl font-black tracking-tight text-amber-100 sm:text-4xl md:text-5xl">
                          {formatTriviaNumber(venueShowdownAnswer)}
                        </div>
                      )}
                    </div>
                  ) : headlineTimerOnly ? (
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-xl border px-3 py-1.5 sm:px-4 sm:py-2 ${
                        timerSeconds <= 10
                          ? 'border-cyan-400/55 bg-cyan-950/45 shadow-[0_0_24px_rgba(34,211,238,0.16)]'
                          : 'border-cyan-600/35 bg-cyan-950/25'
                      }`}
                      aria-live="polite"
                      aria-label={`${timerSeconds} seconds remaining to answer`}
                    >
                      <div className="venue-headline-answer-timer font-mono font-black tabular-nums tracking-tight text-cyan-100">
                        {timerSeconds}s
                      </div>
                    </div>
                  ) : headlineAnsweringUnified ? (
                    <p className="sr-only">Answer on your phone — timer starts when every table finishes wagering</p>
                  ) : headlineAnswering ? (
                    <div
                      className={`flex shrink-0 flex-col items-stretch justify-center gap-1 rounded-lg border px-2 py-1.5 sm:px-3 sm:py-2 ${
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
                        <div className="text-center font-mono text-2xl font-black tabular-nums tracking-tight text-cyan-100 sm:text-4xl md:text-5xl">
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
                </div>
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
